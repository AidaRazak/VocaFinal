// Azure Speech Services Integration
// Provides accurate speech-to-text and pronunciation assessment

import fetch from 'node-fetch';

interface AzureTranscriptionResult {
  transcript: string;
  confidence: number;
}

interface AzurePronunciationAssessment {
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  pronunciationScore: number;
  words: Array<{
    word: string;
    accuracyScore: number;
    errorType: string;
    phonemes: Array<{
      phoneme: string;
      accuracyScore: number;
    }>;
  }>;
}

export async function transcribeAudioWithAzure(audioBuffer: Buffer): Promise<AzureTranscriptionResult> {
  const subscriptionKey = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  
  if (!subscriptionKey || !region) {
    throw new Error('Azure Speech credentials not configured');
  }

  // Use the REST API endpoint that accepts various audio formats
  const endpoint = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`;
  
  const params = new URLSearchParams({
    'language': 'en-US',
    'format': 'detailed',
    'profanity': 'masked'
  });

  try {
    console.log('Calling Azure Speech API with audio buffer size:', audioBuffer.length);
    
    const response = await fetch(`${endpoint}?${params}`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'audio/wav', // Try WAV format
        'Accept': 'application/json'
      },
      body: audioBuffer
    });

    if (!response.ok) {
      throw new Error(`Azure Speech API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as any;
    console.log('Azure Speech API response:', JSON.stringify(result, null, 2));
    
    if (result.RecognitionStatus === 'Success' && result.NBest && result.NBest.length > 0) {
      return {
        transcript: result.NBest[0].Display,
        confidence: result.NBest[0].Confidence
      };
    } else {
      console.log('Azure Speech API recognition failed:', result.RecognitionStatus);
      throw new Error(`No speech recognized: ${result.RecognitionStatus}`);
    }
  } catch (error) {
    console.error('Azure transcription error:', error);
    throw error;
  }
}

export async function assessPronunciationWithAzure(
  audioBuffer: Buffer, 
  referenceText: string
): Promise<AzurePronunciationAssessment> {
  const subscriptionKey = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  
  if (!subscriptionKey || !region) {
    throw new Error('Azure Speech credentials not configured');
  }

  const endpoint = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`;
  
  const params = new URLSearchParams({
    'language': 'en-US',
    'format': 'detailed'
  });

  const pronunciationAssessmentParams = {
    ReferenceText: referenceText,
    GradingSystem: 'HundredMark',
    Granularity: 'Phoneme',
    EnableMiscue: true
  };

  try {
    const response = await fetch(`${endpoint}?${params}`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'audio/wav',
        'Accept': 'application/json',
        'Pronunciation-Assessment': JSON.stringify(pronunciationAssessmentParams)
      },
      body: audioBuffer
    });

    if (!response.ok) {
      throw new Error(`Azure Pronunciation Assessment error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as any;
    
    if (result.RecognitionStatus === 'Success' && result.NBest && result.NBest.length > 0) {
      const best = result.NBest[0];
      const pronunciationAssessment = best.PronunciationAssessment;
      
      return {
        accuracyScore: pronunciationAssessment.AccuracyScore,
        fluencyScore: pronunciationAssessment.FluencyScore,
        completenessScore: pronunciationAssessment.CompletenessScore,
        pronunciationScore: pronunciationAssessment.PronScore,
        words: best.Words?.map((word: any) => ({
          word: word.Word,
          accuracyScore: word.PronunciationAssessment?.AccuracyScore || 0,
          errorType: word.PronunciationAssessment?.ErrorType || 'None',
          phonemes: word.Phonemes?.map((phoneme: any) => ({
            phoneme: phoneme.Phoneme,
            accuracyScore: phoneme.PronunciationAssessment?.AccuracyScore || 0
          })) || []
        })) || []
      };
    } else {
      throw new Error('No pronunciation assessment available');
    }
  } catch (error) {
    console.error('Azure pronunciation assessment error:', error);
    throw error;
  }
}