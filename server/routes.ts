import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// import { setupAuth, isAuthenticated } from "./replitAuth"; // Removed Replit Auth
import { insertUserProgressSchema, insertPracticeSessionSchema } from "@shared/schema";
import multer from 'multer';
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

  const httpServer = createServer(app);
  return httpServer;
}
