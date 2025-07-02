import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

// AWS clients
const s3 = new AWS.S3();
const transcribe = new AWS.TranscribeService();
const bucketName = process.env.AUDIO_BUCKET_NAME || 'pronunciationcorrector';

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

// Function to find the best matching brand
function findBestMatch(transcript, validBrands) {
  const transcriptLower = transcript.toLowerCase().trim();
  
  // Direct match
  if (validBrands[transcriptLower]) {
    return { brand: validBrands[transcriptLower], confidence: 1.0 };
  }
  
  // Partial match
  let bestMatch = null;
  let bestScore = 0;
  
  for (const [brandId, brandData] of Object.entries(validBrands)) {
    const brandName = brandId.toLowerCase();
    
    // Check if transcript contains the brand name
    if (transcriptLower.includes(brandName) || brandName.includes(transcriptLower)) {
      const score = Math.min(transcriptLower.length, brandName.length) / Math.max(transcriptLower.length, brandName.length);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { brand: brandData, confidence: score };
      }
    }
  }
  
  return bestMatch && bestScore > 0.3 ? bestMatch : null;
}

// Function to generate phoneme breakdown from phonemes string
function parsePhonemes(phonemesString) {
  if (!phonemesString) return [];
  
  // Split by common separators and clean up
  const phonemeArray = phonemesString
    .split(/[-\s\/]/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  return phonemeArray.map(phoneme => ({
    symbol: phoneme,
    correct: Math.random() > 0.2 // 80% chance of being correct for demonstration
  }));
}

// Full car brand list (add more as needed)
const validBrands = {
  'tesla': { id: 'tesla', description: 'Tesla is a pioneering car brand, recognized worldwide for its engineering excellence.', phonemes: 'tee-eh-ess-ell-ah' },
  'bmw': { id: 'bmw', description: 'BMW is a staple in the automotive industry, known for a wide range of vehicle models.', phonemes: 'buh-em-double-you' },
  'audi': { id: 'audi', description: 'Audi is a staple in the automotive industry, known for a wide range of vehicle models.', phonemes: 'ah-you-duh-ee' },
  'mercedes-benz': { id: 'mercedes-benz', description: 'Mercedes-Benz is a staple in the automotive industry, known for a wide range of vehicle models.', phonemes: 'em-eh-ar-kuh-eh-duh-eh-ess / buh-eh-en-zee' },
  'ford': { id: 'ford', description: 'Ford is a respected automaker famous for both luxury and performance vehicles.', phonemes: 'fuh-oh-ar-duh' },
  'toyota': { id: 'toyota', description: 'Toyota is a staple in the automotive industry, known for a wide range of vehicle models.', phonemes: 'tee-oh-why-oh-tee-ah' },
  'honda': { id: 'honda', description: 'Honda is a respected automaker famous for both luxury and performance vehicles.', phonemes: 'huh-oh-en-duh-ah' },
  'ferrari': { id: 'ferrari', description: 'Ferrari is a pioneering car brand, recognized worldwide for its engineering excellence.', phonemes: 'fuh-eh-ar-ar-ah-ar-ee' },
  'lamborghini': { id: 'lamborghini', description: 'Lamborghini is a staple in the automotive industry, known for a wide range of vehicle models.', phonemes: 'ell-ah-em-buh-oh-ar-guh-huh-ee-en-ee' },
  'porsche': { id: 'porsche', description: 'Porsche is a staple in the automotive industry, known for a wide range of vehicle models.', phonemes: 'puh-oh-ar-ess-kuh-huh-eh' },
  'chevrolet': { id: 'chevrolet', description: 'Chevrolet is globally known for its innovative engineering and vehicle performance.', phonemes: 'kuh-huh-eh-vee-ar-oh-ell-eh-tee' },
  'nissan': { id: 'nissan', description: 'Nissan has built a strong reputation for quality, reliability, and cutting-edge designs.', phonemes: 'en-ee-ess-ess-ah-en' },
  'hyundai': { id: 'hyundai', description: 'Hyundai is a respected automaker famous for both luxury and performance vehicles.', phonemes: 'huh-why-you-en-duh-ah-ee' },
  'kia': { id: 'kia', description: 'Kia is a pioneering car brand, recognized worldwide for its engineering excellence.', phonemes: 'kay-ee-ah' },
  'volkswagen': { id: 'volkswagen', description: 'Volkswagen is a pioneering car brand, recognized worldwide for its engineering excellence.', phonemes: 'vee-oh-ell-kay-ess-double-you-ah-guh-eh-en' },
  'mazda': { id: 'mazda', description: 'Mazda has built a strong reputation for quality, reliability, and cutting-edge designs.', phonemes: 'em-ah-zee-duh-ah' },
  'subaru': { id: 'subaru', description: 'Subaru is a staple in the automotive industry, known for a wide range of vehicle models.', phonemes: 'ess-you-buh-ah-ar-you' },
  'volvo': { id: 'volvo', description: 'Volvo is a staple in the automotive industry, known for a wide range of vehicle models.', phonemes: 'vee-oh-ell-vee-oh' },
  'peugeot': { id: 'peugeot', description: 'Peugeot is a respected automaker famous for both luxury and performance vehicles.', phonemes: 'puh-eh-you-guh-eh-oh-tee' },
  'renault': { id: 'renault', description: 'Renault is a respected automaker famous for both luxury and performance vehicles.', phonemes: 'ar-eh-en-ah-you-ell-tee' },
  'fiat': { id: 'fiat', description: 'Fiat has built a strong reputation for quality, reliability, and cutting-edge designs.', phonemes: 'fuh-ee-ah-tee' },
  'chrysler': { id: 'chrysler', description: 'Chrysler is a respected automaker famous for both luxury and performance vehicles.', phonemes: 'kuh-huh-ar-why-ess-ell-eh-ar' },
  'dodge': { id: 'dodge', description: 'Dodge is a pioneering car brand, recognized worldwide for its engineering excellence.', phonemes: 'duh-oh-duh-guh-eh' },
  'jeep': { id: 'jeep', description: 'Jeep has built a strong reputation for quality, reliability, and cutting-edge designs.', phonemes: 'juh-eh-eh-puh' },
  'gmc': { id: 'gmc', description: 'GMC is globally known for its innovative engineering and vehicle performance.', phonemes: 'guh-em-kuh' },
  'buick': { id: 'buick', description: 'Buick is a staple in the automotive industry, known for a wide range of vehicle models.', phonemes: 'buh-you-ee-kuh-kay' },
  'cadillac': { id: 'cadillac', description: 'Cadillac is a pioneering car brand, recognized worldwide for its engineering excellence.', phonemes: 'kuh-ah-duh-ee-ell-ell-ah-kuh' },
  'lincoln': { id: 'lincoln', description: 'Lincoln is a pioneering car brand, recognized worldwide for its engineering excellence.', phonemes: 'ell-ee-en-kuh-oh-ell-en' },
  'acura': { id: 'acura', description: 'Acura has built a strong reputation for quality, reliability, and cutting-edge designs.', phonemes: 'ah-kuh-you-ar-ah' },
  'infiniti': { id: 'infiniti', description: 'Infiniti is globally known for its innovative engineering and vehicle performance.', phonemes: 'ee-en-fuh-ee-en-ee-tee-ee' },
  'lexus': { id: 'lexus', description: 'Lexus is globally known for its innovative engineering and vehicle performance.', phonemes: 'ell-eh-eks-you-ess' },
  'mitsubishi': { id: 'mitsubishi', description: 'Mitsubishi is a pioneering car brand, recognized worldwide for its engineering excellence.', phonemes: 'em-ee-tee-ess-you-buh-ee-ess-huh-ee' },
  'suzuki': { id: 'suzuki', description: 'Suzuki is a respected automaker famous for both luxury and performance vehicles.', phonemes: 'ess-you-zee-you-kay-ee' },
  'isuzu': { id: 'isuzu', description: 'Isuzu is a respected automaker famous for both luxury and performance vehicles.', phonemes: 'ee-ess-you-zee-you' },
  'skoda': { id: 'skoda', description: 'Skoda is a pioneering car brand, recognized worldwide for its engineering excellence.', phonemes: 'ess-kay-oh-duh-ah' },
  'seat': { id: 'seat', description: 'Seat has built a strong reputation for quality, reliability, and cutting-edge designs.', phonemes: 'ess-eh-ah-tee' },
  // ... add more brands as needed
};

export const handler = async (event) => {
  // Handle OPTIONS request for CORS
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }
  // Handle GET request for polling
  if (event.requestContext?.http?.method === 'GET') {
    const jobName = event.queryStringParameters?.jobName;
    if (!jobName) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing jobName in request" })
      };
    }
    try {
      const job = await transcribe.getTranscriptionJob({ TranscriptionJobName: jobName }).promise();
      const status = job.TranscriptionJob.TranscriptionJobStatus;
      if (status === "COMPLETED") {
        const transcriptUri = job.TranscriptionJob.Transcript.TranscriptFileUri;
        const transcriptResponse = await fetch(transcriptUri);
        const transcriptData = await transcriptResponse.json();
        const actualTranscript = transcriptData.results.transcripts[0].transcript.toLowerCase().trim();
        const match = findBestMatch(actualTranscript, validBrands);
        if (!match) {
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              status: "COMPLETED",
              brandFound: false,
              message: "Car brand not found in database",
              transcript: actualTranscript,
              accuracy: 0,
              phonemes: [],
              waveform: [],
              correctPronunciation: null
            })
          };
        }
        const { brand, confidence } = match;
        const phonemeArray = parsePhonemes(brand.phonemes);
        const baseAccuracy = Math.max(30, Math.round(confidence * 100));
        const phonemeAccuracy = phonemeArray.filter(p => p.correct).length / phonemeArray.length;
        const finalAccuracy = Math.round((baseAccuracy + phonemeAccuracy * 70) / 2);
        const waveformLength = Math.floor(Math.random() * 15) + 10;
        const waveform = Array.from({ length: waveformLength }, () => Math.random() * 0.5 + 0.1);
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            status: "COMPLETED",
            brandFound: true,
            transcript: actualTranscript,
            detectedBrand: brand.id,
            accuracy: finalAccuracy,
            phonemes: phonemeArray,
            waveform: waveform,
            correctPronunciation: brand.phonemes,
            brandDescription: brand.description
          })
        };
      } else if (status === "FAILED") {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ status: "FAILED", error: job.TranscriptionJob.FailureReason })
        };
      } else {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ status })
        };
      }
    } catch (err) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Failed to fetch transcription job", details: err.message })
      };
    }
  }
  try {
    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid JSON in request body", details: e.message })
      };
    }
    const { audioData, contentType, brand } = body;
    if (!audioData) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing audioData in request" })
      };
    }
    if (!contentType) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing contentType in request" })
      };
    }
    const timestamp = Date.now();
    const jobName = `transcription-${timestamp}`;
    const s3Key = `audio/${brand || 'unknown'}/${jobName}.webm`;
    const audioBuffer = Buffer.from(audioData, 'base64');
    await s3.putObject({
      Bucket: bucketName,
      Key: s3Key,
      Body: audioBuffer,
      ContentType: contentType
    }).promise();
    const transcriptionParams = {
      TranscriptionJobName: jobName,
      LanguageCode: "en-US",
      MediaFormat: "webm",
      Media: {
        MediaFileUri: `s3://${bucketName}/${s3Key}`
      },
      Settings: {
        ShowSpeakerLabels: true,
        MaxSpeakerLabels: 2
      }
    };
    await transcribe.startTranscriptionJob(transcriptionParams).promise();
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ jobName, s3Key })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal server error", details: error.message })
    };
  }
};