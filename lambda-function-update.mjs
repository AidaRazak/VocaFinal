import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
// Note: fetch is built-in for Node.js 18+ in AWS Lambda

const s3 = new AWS.S3();
const transcribe = new AWS.TranscribeService();
const bucketName = 'pronunciationcorrector';

export const handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const body = JSON.parse(event.body);
        console.log('Request body:', body);

        // Handle polling requests
        if (body.mode === 'poll' && body.jobName) {
            return await handlePolling(body.jobName, headers);
        }

        // Handle initial transcription requests
        if (!body.audioData || !body.contentType) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing audioData or contentType in request' })
            };
        }

        return await handleTranscription(body, headers);
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', details: error.message })
        };
    }
};

async function handleTranscription(body, headers) {
    const { audioData, contentType, targetWord, expectedPhonemes, brandInfo, mode } = body;
    
    // Generate unique identifiers
    const jobName = `transcription-${Date.now()}`;
    const s3Key = `audio/${targetWord || 'unknown'}/${jobName}.webm`;
    
    try {
        // Upload audio to S3
        const audioBuffer = Buffer.from(audioData, 'base64');
        
        await s3.upload({
            Bucket: bucketName,
            Key: s3Key,
            Body: audioBuffer,
            ContentType: contentType
        }).promise();
        
        console.log(`Audio uploaded to S3: ${s3Key}`);
        
        // Start transcription job
        const transcriptionParams = {
            TranscriptionJobName: jobName,
            LanguageCode: 'en-US',
            Media: {
                MediaFileUri: `s3://${bucketName}/${s3Key}`
            },
            OutputBucketName: bucketName,
            OutputKey: `transcriptions/${jobName}.json`
        };
        
        await transcribe.startTranscriptionJob(transcriptionParams).promise();
        console.log(`Transcription job started: ${jobName}`);
        
        // For search mode, return immediately with jobName for polling
        if (mode === 'search') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    jobName,
                    s3Key,
                    message: 'Transcription job started, poll for results'
                })
            };
        }
        
        // For practice mode, wait and then process with Azure
        // Poll for completion (for practice mode)
        const transcriptResult = await waitForTranscription(jobName);
        
        if (transcriptResult.transcript) {
            // Process with Azure for pronunciation assessment
            const azureResult = await processWithAzure(transcriptResult.transcript, targetWord, expectedPhonemes, brandInfo, s3Key);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(azureResult)
            };
        } else {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    jobName,
                    s3Key,
                    message: 'Transcription failed or no speech detected'
                })
            };
        }
        
    } catch (error) {
        console.error('Error in transcription process:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Transcription process failed', details: error.message })
        };
    }
}

async function handlePolling(jobName, headers) {
    try {
        // Check transcription job status
        const jobStatus = await transcribe.getTranscriptionJob({
            TranscriptionJobName: jobName
        }).promise();
        
        const status = jobStatus.TranscriptionJob.TranscriptionJobStatus;
        console.log(`Job ${jobName} status: ${status}`);
        
        if (status === 'COMPLETED') {
            // Get the transcript
            const outputUri = jobStatus.TranscriptionJob.Transcript.TranscriptFileUri;
            const transcript = await getTranscriptFromS3(outputUri);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    status: 'COMPLETED',
                    transcript: transcript,
                    jobName: jobName
                })
            };
        } else if (status === 'FAILED') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    status: 'FAILED',
                    jobName: jobName,
                    error: 'Transcription job failed'
                })
            };
        } else {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    status: 'IN_PROGRESS',
                    jobName: jobName
                })
            };
        }
        
    } catch (error) {
        console.error('Error polling transcription job:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to poll transcription job', details: error.message })
        };
    }
}

async function waitForTranscription(jobName, maxWaitTime = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
        try {
            const jobStatus = await transcribe.getTranscriptionJob({
                TranscriptionJobName: jobName
            }).promise();
            
            const status = jobStatus.TranscriptionJob.TranscriptionJobStatus;
            
            if (status === 'COMPLETED') {
                const outputUri = jobStatus.TranscriptionJob.Transcript.TranscriptFileUri;
                const transcript = await getTranscriptFromS3(outputUri);
                return { transcript };
            } else if (status === 'FAILED') {
                return { error: 'Transcription failed' };
            }
            
            // Wait 2 seconds before checking again
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error('Error waiting for transcription:', error);
            return { error: error.message };
        }
    }
    
    return { error: 'Transcription timeout' };
}

async function getTranscriptFromS3(outputUri) {
    try {
        // Extract bucket and key from the S3 URI
        const url = new URL(outputUri);
        const bucket = url.hostname.split('.')[0];
        const key = url.pathname.substring(1);
        
        const response = await s3.getObject({
            Bucket: bucket,
            Key: key
        }).promise();
        
        const transcriptData = JSON.parse(response.Body.toString());
        return transcriptData.results.transcripts[0]?.transcript || '';
        
    } catch (error) {
        console.error('Error getting transcript from S3:', error);
        return '';
    }
}

async function processWithAzure(transcript, targetWord, expectedPhonemes, brandInfo, audioS3Key) {
    try {
        const azureSpeechKey = process.env.AZURE_SPEECH_KEY;
        const azureSpeechRegion = process.env.AZURE_SPEECH_REGION;
        
        if (!azureSpeechKey || !azureSpeechRegion) {
            console.error('Azure Speech credentials not found');
            throw new Error('Azure Speech credentials not configured');
        }

        // Get the audio file from S3 for Azure analysis
        const audioResponse = await s3.getObject({
            Bucket: bucketName,
            Key: audioS3Key
        }).promise();
        
        const audioBuffer = audioResponse.Body;
        
        // Azure Speech Services Pronunciation Assessment API
        // Use the endpoint from environment variables if provided, otherwise construct from region
        const azureEndpoint = process.env.AZURE_SPEECH_ENDPOINT || 
                             `https://${azureSpeechRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`;
        
        const pronunciationAssessmentParams = {
            ReferenceText: targetWord,
            GradingSystem: "HundredMark",
            Granularity: "Phoneme",
            Dimension: "Comprehensive",
            EnableMiscue: true
        };
        
        const params = new URLSearchParams({
            'language': 'en-US',
            'format': 'detailed'
        });
        
        const response = await fetch(`${azureEndpoint}?${params}`, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': azureSpeechKey,
                'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
                'Pronunciation-Assessment': JSON.stringify(pronunciationAssessmentParams)
            },
            body: audioBuffer
        });
        
        if (!response.ok) {
            throw new Error(`Azure API request failed: ${response.status}`);
        }
        
        const azureResult = await response.json();
        console.log('Azure result:', JSON.stringify(azureResult, null, 2));
        
        // Process Azure results
        const pronunciationAssessment = azureResult.NBest?.[0]?.PronunciationAssessment;
        const words = azureResult.NBest?.[0]?.Words || [];
        
        if (!pronunciationAssessment) {
            throw new Error('No pronunciation assessment data from Azure');
        }
        
        // Extract detailed feedback
        const accuracy = Math.round(pronunciationAssessment.AccuracyScore);
        const fluency = Math.round(pronunciationAssessment.FluencyScore);
        const completeness = Math.round(pronunciationAssessment.CompletenessScore);
        const overallScore = Math.round(pronunciationAssessment.PronScore);
        
        // Process phoneme-level feedback
        const phonemeDetails = [];
        const wordDetails = [];
        
        words.forEach(word => {
            wordDetails.push({
                word: word.Word,
                accuracy: Math.round(word.PronunciationAssessment?.AccuracyScore || 0),
                errorType: word.PronunciationAssessment?.ErrorType || 'None'
            });
            
            if (word.Phonemes) {
                word.Phonemes.forEach(phoneme => {
                    phonemeDetails.push({
                        symbol: phoneme.Phoneme,
                        accuracy: Math.round(phoneme.PronunciationAssessment?.AccuracyScore || 0),
                        correct: phoneme.PronunciationAssessment?.AccuracyScore >= 60
                    });
                });
            }
        });
        
        // Generate feedback message
        let feedback = '';
        if (overallScore >= 80) {
            feedback = `Excellent pronunciation! Your overall score is ${overallScore}%.`;
        } else if (overallScore >= 60) {
            feedback = `Good pronunciation with room for improvement. Your score is ${overallScore}%.`;
        } else {
            feedback = `Practice needed. Your pronunciation score is ${overallScore}%. Focus on clarity and accuracy.`;
        }
        
        // Generate suggestions based on low-scoring phonemes
        const suggestions = [];
        const lowScoringPhonemes = phonemeDetails.filter(p => p.accuracy < 60);
        if (lowScoringPhonemes.length > 0) {
            suggestions.push(`Focus on these sounds: ${lowScoringPhonemes.map(p => p.symbol).join(', ')}`);
        }
        if (fluency < 60) {
            suggestions.push('Try speaking more smoothly and naturally');
        }
        if (completeness < 80) {
            suggestions.push('Make sure to pronounce the complete word clearly');
        }
        
        return {
            transcript: transcript,
            detectedBrand: targetWord,
            accuracy: overallScore,
            fluencyScore: fluency,
            completenessScore: completeness,
            pronunciationFeedback: feedback,
            correctPhonemes: expectedPhonemes ? expectedPhonemes.split('-').map(p => ({ symbol: p.trim(), correct: true })) : [],
            userPhonemes: phonemeDetails,
            wordDetails: wordDetails,
            suggestions: suggestions,
            brandFound: overallScore >= 60,
            message: feedback,
            brandDescription: brandInfo?.description,
            azureDetails: {
                accuracyScore: accuracy,
                fluencyScore: fluency,
                completenessScore: completeness,
                overallScore: overallScore
            }
        };
        
    } catch (error) {
        console.error('Error processing with Azure:', error);
        
        // Fallback to basic transcript analysis if Azure fails
        const detectedBrand = transcript.toLowerCase();
        const targetBrand = targetWord?.toLowerCase() || '';
        const brandMatch = detectedBrand.includes(targetBrand) || targetBrand.includes(detectedBrand);
        const accuracy = brandMatch ? Math.max(70, 100 - (Math.abs(detectedBrand.length - targetBrand.length) * 10)) : 0;
        
        return {
            transcript: transcript,
            detectedBrand: targetWord,
            accuracy: accuracy,
            pronunciationFeedback: brandMatch 
                ? `I heard "${transcript}" which matches ${targetWord}. (Using basic analysis due to Azure connection issue)`
                : `I heard "${transcript}" but expected "${targetWord}". (Using basic analysis due to Azure connection issue)`,
            correctPhonemes: expectedPhonemes ? expectedPhonemes.split('-').map(p => ({ symbol: p.trim(), correct: true })) : [],
            userPhonemes: transcript.split(' ').map(word => ({ symbol: word, correct: brandMatch })),
            suggestions: brandMatch ? [] : [`Focus on the ${expectedPhonemes} sounds`, 'Speak more slowly and clearly'],
            brandFound: brandMatch,
            message: `Analysis completed with basic scoring. Azure connection issue: ${error.message}`,
            brandDescription: brandInfo?.description,
            error: `Azure processing failed: ${error.message}`
        };
    }
}