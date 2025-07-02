import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Play, RotateCcw, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

const CAR_BRANDS = [
  {
    name: "Tesla",
    pronunciation: "TES-luh",
    phonemes: "t-e-s-l-a",
    country: "USA",
    founded: "2003",
    description: "American electric vehicle and clean energy company founded by Elon Musk."
  },
  {
    name: "BMW",
    pronunciation: "BEE-em-DOUBLE-you",
    phonemes: "b-e-e-m-w",
    country: "Germany",
    founded: "1916",
    description: "Bavarian Motor Works, German luxury vehicle manufacturer."
  },
  {
    name: "Mercedes",
    pronunciation: "mer-SAY-deez",
    phonemes: "m-er-c-e-d-e-s",
    country: "Germany", 
    founded: "1926",
    description: "German luxury automotive brand and division of Daimler AG."
  },
  {
    name: "Toyota",
    pronunciation: "toh-YO-tah",
    phonemes: "t-o-y-o-t-a",
    country: "Japan",
    founded: "1937", 
    description: "Japanese automotive manufacturer, world's largest automaker by sales."
  },
  {
    name: "Honda",
    pronunciation: "HON-dah",
    phonemes: "h-o-n-d-a",
    country: "Japan",
    founded: "1946",
    description: "Japanese multinational conglomerate known for automobiles and motorcycles."
  },
  {
    name: "Ford",
    pronunciation: "FORD",
    phonemes: "f-o-r-d",
    country: "USA",
    founded: "1903",
    description: "American multinational automaker founded by Henry Ford."
  },
  {
    name: "Audi",
    pronunciation: "AW-dee",
    phonemes: "a-u-d-i",
    country: "Germany",
    founded: "1909",
    description: "German luxury automobile manufacturer and subsidiary of Volkswagen Group."
  },
  {
    name: "Nissan",
    pronunciation: "NEE-sahn", 
    phonemes: "n-i-s-s-a-n",
    country: "Japan",
    founded: "1933",
    description: "Japanese multinational automobile manufacturer headquartered in Yokohama."
  },
  {
    name: "Hyundai",
    pronunciation: "HUN-day",
    phonemes: "h-y-u-n-d-a-i",
    country: "South Korea",
    founded: "1967",
    description: "South Korean multinational automotive manufacturer."
  },
  {
    name: "Volkswagen",
    pronunciation: "FOLKS-vah-gen",
    phonemes: "v-o-l-k-s-w-a-g-e-n",
    country: "Germany", 
    founded: "1937",
    description: "German automotive manufacturer and largest automaker in Europe."
  }
];

interface Brand {
  name: string;
  pronunciation: string;
  phonemes: string;
  country: string;
  founded: string;
  description: string;
}

interface Phoneme {
  symbol: string;
  label?: string;
  correct?: boolean;
  brandDescription?: string;
}

interface TranscriptionResult {
  transcript?: string;
  detectedBrand?: string;
  pronunciationFeedback?: string;
  correctPhonemes?: Phoneme[];
  userPhonemes?: Phoneme[];
  accuracy?: number;
  brandFound?: boolean;
  message?: string;
  waveform?: number[];
  correctPronunciation?: string;
  referenceWaveform?: number[];
  suggestions?: string[];
  brandDescription?: string;
  brandLogo?: string;
  brandCountry?: string;
  brandFounded?: string;
  brandImages?: string[];
  azureDetails?: any;
}

function normalizeBrand(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getClosestBrands(input: string, allBrands: Brand[], maxDistance = 3): Brand[] {
  const normalizedInput = normalizeBrand(input);
  return allBrands
    .map(brand => ({
      brand,
      distance: levenshteinDistance(normalizedInput, normalizeBrand(brand.name))
    }))
    .filter(item => item.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .map(item => item.brand);
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

const FeedbackDisplay = ({ result, onTryAgain, audioUrl }: { result: TranscriptionResult, onTryAgain: () => void, audioUrl?: string | null }) => {
  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>AI Analysis Results</span>
            <Badge variant={result.brandFound ? "default" : "destructive"}>
              {result.accuracy}% Accuracy
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">What I heard:</h3>
            <p className="text-lg bg-muted p-3 rounded">{result.transcript}</p>
          </div>

          {result.detectedBrand && (
            <div>
              <h3 className="font-semibold mb-2">Detected Brand:</h3>
              <p className="text-lg text-blue-600 font-medium">{result.detectedBrand}</p>
            </div>
          )}

          {result.pronunciationFeedback && (
            <div>
              <h3 className="font-semibold mb-2">Pronunciation Feedback:</h3>
              <p className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                {result.pronunciationFeedback}
              </p>
            </div>
          )}

          {result.userPhonemes && result.userPhonemes.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Sound Analysis:</h3>
              <div className="flex flex-wrap gap-2">
                {result.userPhonemes.map((phoneme, index) => (
                  <Badge 
                    key={index} 
                    variant={phoneme.correct ? "default" : "destructive"}
                    className="text-sm"
                  >
                    {phoneme.symbol} {phoneme.correct ? "✓" : "✗"}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {result.suggestions && result.suggestions.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Suggestions for Improvement:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {result.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-muted-foreground">{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {result.azureDetails && (
            <div>
              <h3 className="font-semibold mb-2">Detailed Scores:</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>Accuracy: {result.azureDetails.accuracyScore}%</div>
                <div>Fluency: {result.azureDetails.fluencyScore}%</div>
                <div>Completeness: {result.azureDetails.completenessScore}%</div>
                <div>Overall: {result.azureDetails.overallScore}%</div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            {audioUrl && (
              <Button onClick={playAudio} variant="outline" size="sm">
                <Play className="w-4 h-4 mr-2" />
                Play Recording
              </Button>
            )}
            <Button onClick={onTryAgain} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function AIFeedback() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [isRecording, setIsRecording] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setError(null);

    try {
      console.log('Processing audio with AWS Lambda...');
      
      // Convert audio blob to base64
      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(audioBlob);
      });

      const lambdaUrl = import.meta.env.VITE_LAMBDA_URL;
      if (!lambdaUrl) {
        throw new Error('Lambda URL not configured. Please set VITE_LAMBDA_URL environment variable.');
      }
      
      console.log('Sending request to Lambda:', lambdaUrl);
      
      let response;
      try {
        response = await fetch(lambdaUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audioData: base64Audio,
            contentType: 'audio/webm;codecs=opus',
            mode: 'ai_feedback'
          }),
        });
      } catch (fetchError: any) {
        console.log('Fetch error details:', fetchError);
        console.log('Error name:', fetchError.name);
        console.log('Error message:', fetchError.message);
        
        if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
          throw new Error('CORS Error: Cannot connect to AWS Lambda. Please:\n1. Deploy your API Gateway after CORS changes\n2. Check if your Lambda function returns proper CORS headers\n3. Verify the Lambda URL is accessible');
        }
        throw fetchError;
      }

      console.log('Lambda response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Lambda error response:', errorText);
        throw new Error(`Lambda function error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Lambda response:', data);

      // If it's a polling response, start polling
      if (data.jobName && !data.transcript) {
        await pollForResults(data.jobName);
        return;
      }

      // Process the result
      const bestMatch = findBestMatch(data.transcript);
      const processedResult: TranscriptionResult = {
        transcript: data.transcript,
        detectedBrand: data.detectedBrand || (bestMatch ? bestMatch.name : undefined),
        pronunciationFeedback: data.pronunciationFeedback || generateFeedback(data.transcript),
        correctPhonemes: data.correctPhonemes || [],
        userPhonemes: data.userPhonemes || [],
        accuracy: data.accuracy || calculateAccuracy(data.transcript),
        brandFound: data.brandFound || !!bestMatch,
        message: data.message,
        suggestions: data.suggestions || [],
        brandDescription: data.brandDescription,
        azureDetails: data.azureDetails
      };

      console.log('Processed result:', processedResult);
      setResult(processedResult);
      
    } catch (error: any) {
      console.error('Error processing audio:', error);
      setError(`Failed to process audio: ${error.message}`);
      toast({
        title: "Processing failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const pollForResults = async (jobName: string) => {
    const maxAttempts = 30;
    const pollInterval = 2000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const lambdaUrl = import.meta.env.VITE_LAMBDA_URL;
        const response = await fetch(lambdaUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mode: 'poll',
            jobName: jobName
          }),
        });

        if (!response.ok) {
          throw new Error(`Polling failed: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Polling attempt ${attempt + 1}:`, data);

        if (data.status === 'COMPLETED' && data.transcript) {
          const processedResult: TranscriptionResult = {
            transcript: data.transcript,
            detectedBrand: findBestMatch(data.transcript)?.name || undefined,
            pronunciationFeedback: generateFeedback(data.transcript),
            correctPhonemes: [],
            userPhonemes: [],
            accuracy: calculateAccuracy(data.transcript),
            brandFound: !!findBestMatch(data.transcript),
            message: 'Transcription completed successfully',
            suggestions: generateSuggestions(data.transcript),
            brandDescription: findBestMatch(data.transcript)?.description
          };
          
          setResult(processedResult);
          return;
        } else if (data.status === 'FAILED') {
          throw new Error('Transcription job failed');
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        console.error(`Polling error on attempt ${attempt + 1}:`, error);
        if (attempt === maxAttempts - 1) {
          throw error;
        }
      }
    }
    
    throw new Error('Transcription timeout - please try again');
  };

  const findBestMatch = (transcript: string): Brand | null => {
    if (!transcript) return null;
    const closest = getClosestBrands(transcript, CAR_BRANDS, 2);
    return closest.length > 0 ? closest[0] : null;
  };

  const generateFeedback = (transcript: string): string => {
    const match = findBestMatch(transcript);
    if (match) {
      return `Great job! I detected "${match.name}". Your pronunciation was clear.`;
    }
    return `I heard "${transcript}". Try speaking more clearly or choose a different car brand.`;
  };

  const calculateAccuracy = (transcript: string): number => {
    const match = findBestMatch(transcript);
    if (!match) return 0;
    
    const distance = levenshteinDistance(
      normalizeBrand(transcript), 
      normalizeBrand(match.name)
    );
    const maxLength = Math.max(transcript.length, match.name.length);
    return Math.max(0, Math.round((1 - distance / maxLength) * 100));
  };

  const generateSuggestions = (transcript: string): string[] => {
    const match = findBestMatch(transcript);
    if (!match) {
      return [
        "Try speaking more slowly and clearly",
        "Make sure to pronounce each syllable",
        "Choose a well-known car brand"
      ];
    }
    return [
      `Practice the pronunciation: ${match.pronunciation}`,
      "Focus on clear consonant sounds",
      "Try recording in a quiet environment"
    ];
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      
      mediaRecorderRef.current = mediaRecorder;
      const audioChunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        processAudio(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setHasStarted(true);
      
      toast({
        title: "Recording started",
        description: "Speak any car brand name clearly",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      toast({
        title: "Recording stopped",
        description: "Processing your pronunciation...",
      });
    }
  };

  const resetRecording = () => {
    setResult(null);
    setError(null);
    setAudioUrl(null);
    setIsProcessing(false);
    setHasStarted(false);
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => setLocation('/dashboard')} 
              variant="ghost" 
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">AI Pronunciation Analysis</h1>
          </div>
          
          <FeedbackDisplay 
            result={result} 
            onTryAgain={resetRecording} 
            audioUrl={audioUrl} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => setLocation('/dashboard')} 
            variant="ghost" 
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">AI Pronunciation Practice</h1>
        </div>

        <Card className="text-center">
          <CardHeader>
            <CardTitle>Speak Any Car Brand</CardTitle>
            <p className="text-muted-foreground">
              Say2 any car brand name and get instant AI feedback on your pronunciation
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {!hasStarted && (
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                <p className="text-sm text-blue-700">
                  Try brands like: Tesla, BMW, Mercedes, Toyota, Honda, Ford, Audi, Nissan, Hyundai, Volkswagen
                </p>
              </div>
            )}

            <div className="flex flex-col items-center space-y-4">
              {!isRecording && !isProcessing ? (
                <Button 
                  onClick={startRecording}
                  size="lg"
                  className="h-20 w-20 rounded-full bg-blue-600 hover:bg-blue-700"
                >
                  <Mic className="w-8 h-8" />
                </Button>
              ) : isRecording ? (
                <Button 
                  onClick={stopRecording}
                  size="lg"
                  variant="destructive"
                  className="h-20 w-20 rounded-full animate-pulse"
                >
                  <MicOff className="w-8 h-8" />
                </Button>
              ) : (
                <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                {!isRecording && !isProcessing 
                  ? "Click to start recording" 
                  : isRecording 
                    ? "Recording... Click to stop" 
                    : "Analyzing your pronunciation..."
                }
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}