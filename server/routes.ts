import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// import { setupAuth, isAuthenticated } from "./replitAuth"; // Removed Replit Auth
import { insertUserProgressSchema, insertPracticeSessionSchema } from "@shared/schema";
import multer from 'multer';
import { transcribeAudioWithAzure, assessPronunciationWithAzure } from "./azureSpeech";
import ffmpeg from 'fluent-ffmpeg';
import stream from 'stream';
import { promisify } from 'util';
const finished = promisify(stream.finished);

export async function registerRoutes(app: Express): Promise<Server> {
  // Root route for health check and Railway 404 prevention
  app.get('/', (req, res) => {
    res.send('Hello from Voca!');
  });

  // Auth middleware
  // await setupAuth(app); // Removed Replit Auth

  // Auth routes
  app.get('/api/auth/user', /* isAuthenticated, */ async (req: any, res) => {
    try {
      // const userId = req.user.claims.sub; // This will need to be replaced with Firebase Auth
      // For now, just return 501 Not Implemented
      return res.status(501).json({ message: "Auth not implemented. Replace with Firebase Auth." });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User progress routes
  app.get('/api/user/progress', /* isAuthenticated, */ async (req: any, res) => {
    try {
      // const userId = req.user.claims.sub;
      return res.status(501).json({ message: "Auth not implemented. Replace with Firebase Auth." });
    } catch (error) {
      console.error("Error fetching user progress:", error);
      res.status(500).json({ message: "Failed to fetch user progress" });
    }
  });

  // Practice session routes
  app.post('/api/practice/session', /* isAuthenticated, */ async (req: any, res) => {
    try {
      // const userId = req.user.claims.sub;
      return res.status(501).json({ message: "Auth not implemented. Replace with Firebase Auth." });
    } catch (error) {
      console.error("Error creating practice session:", error);
      res.status(500).json({ message: "Failed to create practice session" });
    }
  });

  app.get('/api/practice/sessions', /* isAuthenticated, */ async (req: any, res) => {
    try {
      // const userId = req.user.claims.sub;
      return res.status(501).json({ message: "Auth not implemented. Replace with Firebase Auth." });
    } catch (error) {
      console.error("Error fetching practice sessions:", error);
      res.status(500).json({ message: "Failed to fetch practice sessions" });
    }
  });

  // Local AI pronunciation analysis (no external dependencies)
  app.post('/api/pronunciation/local', async (req: any, res) => {
    try {
      const { transcript, targetBrand } = req.body;
      if (!transcript) {
        return res.status(400).json({ error: 'Missing transcript in request' });
      }
      const { analyzePronunciation } = await import('./pronunciationAnalyzer');
      const result = analyzePronunciation(transcript);
      console.log('Local pronunciation analysis completed:', result.detectedBrand, result.accuracy);
      res.json(result);
    } catch (error: any) {
      console.error('Local pronunciation analysis error:', error);
      res.status(500).json({ error: 'Analysis failed', details: error.message });
    }
  });

  // Simple test endpoint for pronunciation analysis without audio
  app.post('/api/pronunciation/test-local', async (req: any, res) => {
    try {
      const { brandName } = req.body;
      if (!brandName) {
        return res.status(400).json({ error: 'Missing brandName in request' });
      }
      const { analyzePronunciation } = await import('./pronunciationAnalyzer');
      const result = analyzePronunciation(brandName);
      console.log('Test pronunciation analysis completed:', result.detectedBrand, result.accuracy);
      res.json(result);
    } catch (error: any) {
      console.error('Test pronunciation analysis error:', error);
      res.status(500).json({ error: 'Analysis failed', details: error.message });
    }
  });

  // AWS Lambda proxy route (kept for fallback)
  app.post('/api/pronunciation', async (req: any, res) => {
    try {
      const { audioData, contentType, mode } = req.body;
      if (!audioData || !contentType) {
        return res.status(400).json({ error: 'Missing audioData or contentType' });
      }
      const lambdaUrl = process.env.LAMBDA_URL || 'https://n3yf6j9xdj.execute-api.ap-southeast-1.amazonaws.com/default/processPronunciationAudio';
      const response = await fetch(lambdaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData,
          contentType,
          mode: mode || 'ai_feedback'
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Lambda error response:', response.status, errorText);
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Lambda error details:', errorJson);
          return res.status(response.status).json({ 
            error: 'Lambda function error', 
            details: errorText,
            lambdaError: errorJson 
          });
        } catch (parseError) {
          return res.status(response.status).json({ error: 'Lambda function error', details: errorText });
        }
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Pronunciation API error:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // Polling route for transcription results
  app.post('/api/pronunciation/poll', async (req: any, res) => {
    try {
      const { jobName } = req.body;
      if (!jobName) {
        return res.status(400).json({ error: 'Missing jobName' });
      }
      const lambdaUrl = process.env.LAMBDA_URL || 'https://n3yf6j9xdj.execute-api.ap-southeast-1.amazonaws.com/default/processPronunciationAudio';
      const response = await fetch(lambdaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'poll',
          jobName
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: 'Polling error', details: errorText });
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Polling API error:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // Test endpoint to check Lambda connectivity and environment
  app.post('/api/pronunciation/test', async (req: any, res) => {
    try {
      const lambdaUrl = process.env.LAMBDA_URL || 'https://n3yf6j9xdj.execute-api.ap-southeast-1.amazonaws.com/default/processPronunciationAudio';
      
      console.log('Testing Lambda connectivity with minimal payload...');
      
      const response = await fetch(lambdaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: 'connectivity'
        }),
      });

      const responseText = await response.text();
      console.log('Lambda test response:', response.status, responseText);
      
      let responseJson;
      try {
        responseJson = JSON.parse(responseText);
      } catch (e) {
        responseJson = { rawResponse: responseText };
      }

      res.json({
        status: response.status,
        response: responseJson,
        success: response.ok
      });
      
    } catch (error: any) {
      console.error('Lambda test error:', error);
      res.status(500).json({ error: 'Test failed', details: error.message });
    }
  });

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    }
  });

  // Azure Speech-powered pronunciation analysis route (with fallback to local analyzer)
  app.post('/api/pronunciation/azure', upload.single('audio'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }
      // Get the intended brand from the request
      const intendedBrand = req.body.brand || req.query.brand;
      if (!intendedBrand) {
        return res.status(400).json({ error: 'No brand provided' });
      }
      // Check if Azure Speech credentials are available
      const subscriptionKey = process.env.AZURE_SPEECH_KEY;
      const region = process.env.AZURE_SPEECH_REGION;
      if (!subscriptionKey || !region) {
        return res.status(500).json({ error: 'Azure Speech credentials not configured' });
      }
      let audioBuffer = req.file.buffer;
      let mimeType = req.file.mimetype;
      // If audio is webm, convert to wav
      if (mimeType === 'audio/webm' || mimeType === 'audio/ogg') {
        const wavBuffer = await new Promise<Buffer>((resolve, reject) => {
          const inputStream = new stream.PassThrough();
          inputStream.end(audioBuffer);
          const outputStream = new stream.PassThrough();
          const chunks: Buffer[] = [];
          outputStream.on('data', (chunk) => chunks.push(chunk));
          outputStream.on('end', () => resolve(Buffer.concat(chunks)));
          outputStream.on('error', reject);
          ffmpeg(inputStream)
            .audioCodec('pcm_s16le')
            .format('wav')
            .on('error', reject)
            .pipe(outputStream, { end: true });
        });
        audioBuffer = wavBuffer;
        mimeType = 'audio/wav';
      }
      // Always use Azure pronunciation assessment
      try {
        const assessment = await assessPronunciationWithAzure(audioBuffer, intendedBrand);
        // Use phoneme/word-level scores for more realistic scoring
        let phonemeScores: number[] = [];
        if (assessment.words && assessment.words.length > 0) {
          phonemeScores = assessment.words.flatMap(word => word.phonemes.map(p => p.accuracyScore));
        }
        const avgPhonemeScore = phonemeScores.length > 0 ? (phonemeScores.reduce((a, b) => a + b, 0) / phonemeScores.length) : assessment.pronunciationScore;
        // Final accuracy: weighted average of overall and phoneme scores
        const finalAccuracy = Math.round((assessment.pronunciationScore * 0.6) + (avgPhonemeScore * 0.4));
        // Return result
        return res.json({
          detectedBrand: intendedBrand,
          accuracy: finalAccuracy,
          pronunciationFeedback: generateAzureFeedback({ ...assessment, pronunciationScore: finalAccuracy }, intendedBrand),
          suggestions: generateAzureSuggestions(assessment, intendedBrand),
          brandFound: true,
          message: 'Azure pronunciation analysis completed',
          azureDetails: assessment,
          phonemeScores
        });
      } catch (azureError) {
        console.error('Azure Pronunciation Assessment Error:', azureError);
        let errorMessage = 'Unknown error';
        if (azureError instanceof Error) {
          errorMessage = azureError.message;
        } else if (typeof azureError === 'object' && azureError && 'message' in azureError) {
          errorMessage = (azureError as any).message;
        } else if (typeof azureError === 'string') {
          errorMessage = azureError;
        }
        return res.status(500).json({ error: 'Azure Pronunciation analysis failed', details: errorMessage });
      }
    } catch (error) {
      console.error('Pronunciation analysis route error:', error);
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error && 'message' in error) {
        errorMessage = (error as any).message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      return res.status(500).json({ error: 'Pronunciation analysis failed', details: errorMessage });
    }
  });

  // Helper function for Levenshtein distance
  function levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        if (str2.charAt(j - 1) === str1.charAt(i - 1)) {
          matrix[j][i] = matrix[j - 1][i - 1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i - 1] + 1,
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  // Helper function to generate feedback from Azure assessment
  function generateAzureFeedback(assessment: any, brandName: string): string {
    const score = assessment.pronunciationScore;
    if (score >= 85) {
      return `Excellent pronunciation of "${brandName}"! Your accuracy is ${score}%. Your pronunciation is very close to native-level.`;
    } else if (score >= 70) {
      return `Good pronunciation of "${brandName}". Your accuracy is ${score}%. Some sounds need improvement.`;
    } else if (score >= 50) {
      return `Fair attempt at "${brandName}". Your accuracy is ${score}%. Focus on clarity and phoneme accuracy.`;
    } else {
      return `Keep practicing "${brandName}". Your accuracy is ${score}%. Work on basic pronunciation fundamentals.`;
    }
  }

  // Helper function to generate Azure-based suggestions
  function generateAzureSuggestions(assessment: any, brandName: string): string[] {
    const suggestions = [];
    const score = assessment.pronunciationScore;
    
    if (score < 70) {
      suggestions.push(`Practice saying "${brandName}" slowly and clearly`);
    }
    if (assessment.fluencyScore < 70) {
      suggestions.push('Work on speaking rhythm and flow');
    }
    if (assessment.accuracyScore < 70) {
      suggestions.push('Focus on correct pronunciation of individual sounds');
    }
    if (assessment.completenessScore < 70) {
      suggestions.push('Make sure to pronounce all parts of the word');
    }
    
    suggestions.push('Try recording yourself and comparing with the correct pronunciation');
    return suggestions;
  }

  const httpServer = createServer(app);
  return httpServer;
}
