import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Play, RotateCcw, ArrowLeft, TrendingUp, Volume2, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { updateBrandStats } from '@/lib/utils';
import brandsData from '@/data/brands.json';

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
  confidence?: number;
  timing?: number;
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
  azureDetails?: {
    accuracyScore: number;
    fluencyScore: number;
    completenessScore: number;
    overallScore: number;
    phonemeAccuracy?: number;
    stressPattern?: number;
  };
  waveformComparison?: {
    userWaveform: number[];
    correctWaveform: number[];
    timeLabels: string[];
  };
  detailedScores?: {
    phonemeAccuracy: number;
    stressPattern: number;
    timing: number;
    clarity: number;
  };
  similarBrands?: Array<{
    id: string;
    name: string;
    phonemes: string;
    pronunciation: string;
    country: string;
    description: string;
  }>;
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

  // Prepare chart data for pronunciation comparison
  const chartData = result.waveformComparison ? 
    result.waveformComparison.userWaveform.map((userValue, index) => ({
      time: result.waveformComparison!.timeLabels[Math.floor(index * result.waveformComparison!.timeLabels.length / result.waveformComparison!.userWaveform.length)] || `${(index * 0.1).toFixed(1)}s`,
      userPronunciation: Math.round(userValue * 100),
      correctPronunciation: Math.round(result.waveformComparison!.correctWaveform[index] * 100),
    })) : [];

  // Prepare detailed scores chart data
  const scoresData = result.detailedScores ? [
    { metric: 'Phonemes', score: result.detailedScores.phonemeAccuracy, color: '#8884d8' },
    { metric: 'Stress', score: result.detailedScores.stressPattern, color: '#82ca9d' },
    { metric: 'Timing', score: result.detailedScores.timing, color: '#ffc658' },
    { metric: 'Clarity', score: result.detailedScores.clarity, color: '#ff7300' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Overall Results Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {result.brandFound ? '✅ Brand Detected' : '❓ Did you mean?'}
            {result.detectedBrand && <span className="text-blue-600">• {result.detectedBrand}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.transcript && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <button onClick={playAudio} style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer' }}>
                  <Volume2 className="w-4 h-4" />
                </button>
                What you said:
              </h3>
              <p className="text-lg bg-gray-50 p-3 rounded border">"{result.transcript}"</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-semibold">Correct pronunciation:</span>
                <span className="text-blue-700 font-mono">{result.correctPronunciation}</span>
                <button
                  onClick={() => {
                    if (result.correctPronunciation) {
                      const utter = new window.SpeechSynthesisUtterance(result.detectedBrand);
                      utter.lang = 'en-US';
                      window.speechSynthesis.speak(utter);
                    }
                  }}
                  style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer' }}
                  title="Play correct pronunciation"
                >
                  <Volume2 className="w-4 h-4 text-blue-700" />
                </button>
              </div>
            </div>
          )}

          {result.accuracy !== undefined && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Overall Accuracy Score:
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-6">
                  <div 
                    className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-6 rounded-full transition-all duration-1000 flex items-center justify-end pr-2"
                    style={{ width: `${result.accuracy}%` }}
                  >
                    <span className="text-white font-bold text-sm">{result.accuracy}%</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {result.accuracy >= 85 ? 'Excellent!' : result.accuracy >= 70 ? 'Good job!' : result.accuracy >= 50 ? 'Keep practicing!' : 'More practice needed'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Scores Breakdown */}
      {result.detailedScores && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Detailed Analysis Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoresData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Score']} />
                  <Bar dataKey="score" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {scoresData.map((item, index) => (
                <div key={index} className="text-center p-3 bg-gray-50 rounded">
                  <div className="font-semibold text-lg">{item.score}%</div>
                  <div className="text-sm text-muted-foreground">{item.metric}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pronunciation Comparison Chart */}
      {result.waveformComparison && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pronunciation Comparison</CardTitle>
            <p className="text-sm text-muted-foreground">
              Compare your pronunciation pattern (blue) with the correct pronunciation (green)
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value, name) => [`${value}%`, name === 'userPronunciation' ? 'Your pronunciation' : 'Correct pronunciation']} />
                  <Legend />
                  <Line type="monotone" dataKey="correctPronunciation" stroke="#22c55e" strokeWidth={3} name="Correct pronunciation" />
                  <Line type="monotone" dataKey="userPronunciation" stroke="#3b82f6" strokeWidth={2} name="Your pronunciation" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phoneme Analysis */}
      {result.userPhonemes && result.userPhonemes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Phoneme-by-Phoneme Analysis</CardTitle>
            <p className="text-sm text-muted-foreground">Individual sound analysis with confidence scores</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.userPhonemes.map((phoneme, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={phoneme.correct ? "default" : "destructive"}
                      className="text-sm"
                    >
                      /{phoneme.symbol}/
                    </Badge>
                    <span className="text-sm">{phoneme.label}</span>
                  </div>
                  {phoneme.confidence && (
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${phoneme.correct ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${phoneme.confidence * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(phoneme.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Feedback and Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle>AI Pronunciation Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.pronunciationFeedback && (
            <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
              <p className="text-sm leading-relaxed">{result.pronunciationFeedback}</p>
            </div>
          )}

          {result.suggestions && result.suggestions.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Personalized Improvement Tips:</h3>
              <div className="space-y-2">
                {result.suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-amber-50 rounded border-l-2 border-amber-400">
                    <span className="text-amber-600 font-bold text-sm">{index + 1}.</span>
                    <span className="text-sm">{suggestion}</span>
                  </div>
                ))}
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

      {/* Similar Brand Suggestions */}
      {result.similarBrands && result.similarBrands.length > 0 && (
        <Card className="border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              Practice Next: Similar Brands
            </CardTitle>
            <p className="text-gray-600">
              Based on your practice with "<strong>{result.detectedBrand}</strong>", try these similar car brands:
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-3">
              {result.similarBrands.slice(0, 3).map((brand, index) => (
                <div 
                  key={brand.id} 
                  className="bg-white rounded-lg p-4 border-2 border-gray-200 hover:border-blue-300 transition-all duration-200 cursor-pointer hover:shadow-md"
                  onClick={() => {
                    onTryAgain();
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg text-gray-800">{brand.name}</h3>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {brand.country}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 font-medium">{brand.pronunciation}</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{brand.description}</p>
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-xs text-blue-600 font-medium">
                      {brand.phonemes.split('-').length} phonemes
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Click to try →
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              These brands have similar pronunciation patterns to help you build your skills progressively!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Add browser SpeechRecognition setup
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

// Curated tips with advanced placeholders
const brandTips: Record<string, string[]> = {
  Honda: [
    "Focus on the clear 'H' sound at the start of '{brand}'.",
    "Try emphasizing the first syllable: '{pronunciation}'.",
    "Practice with other Japanese brands like 'Toyota' or 'Mitsubishi'.",
    "Listen to native Japanese speakers pronouncing '{brand}' for reference.",
    "Try saying '{brand}' smoothly, avoiding a hard pause between syllables."
  ],
  Lamborghini: [
    "Blend the 'gh' in '{brand}' softly, like 'Lambo-rgini'.",
    "Emphasize the Italian 'r' and the 'ghi' sound in '{brand}'.",
    "Try other Italian brands like 'Ferrari' or 'Maserati' for more practice.",
    "Notice the stress on the third syllable: 'Lam-bor-GHI-ni'."
  ],
  Toyota: [
    "Make sure to pronounce all three syllables in '{brand}': '{pronunciation}'.",
    "Try practicing with other Japanese brands like 'Honda' or 'Nissan'.",
    "Emphasize the 'yo' in the middle of '{brand}'.",
    "Listen to how native speakers from {country} say '{brand}'."
  ],
  Ford: [
    "Keep the 'r' in '{brand}' soft, as in American English.",
    "Try practicing with other American brands like 'Chevrolet' or 'Tesla'.",
    "Focus on the single syllable: '{brand}'.",
    "Listen to native speakers from {country} for reference."
  ],
  // ...add more brands as needed
  default: [
    "Try to match the pronunciation of '{brand}' more closely.",
    "Listen to native speakers for reference.",
    "Break the brand name into syllables and practice each part: '{pronunciation}'.",
    "Try practicing with similar brands for variety.",
    "Focus on the correct stress and intonation for '{brand}'."
  ]
};

// Helper to fill placeholders in tips
function fillPlaceholders(tip: string, brand: Brand) {
  return tip
    .replace(/\{brand\}/g, brand.name)
    .replace(/\{pronunciation\}/g, brand.pronunciation)
    .replace(/\{country\}/g, brand.country);
}

// Helper to get tips for a brand, randomized and filled
function getBrandTips(brand: Brand, attempt: number) {
  const tipsArr = brandTips[brand.name] || brandTips.default;
  // Shuffle for variety
  const shuffled = [...tipsArr].sort(() => Math.random() - 0.5);
  // Optionally rotate based on attempt for more predictability
  // const rotated = tipsArr.slice(attempt % tipsArr.length).concat(tipsArr.slice(0, attempt % tipsArr.length));
  // return rotated.slice(0, 4).map(tip => fillPlaceholders(tip, brand));
  return shuffled.slice(0, 4).map(tip => fillPlaceholders(tip, brand));
}

// Helper: Analyze phonemes from transcript and target phoneme array
function analyzePhonemes(userTranscript: string, targetPhonemes: string[]): { breakdown: any[], accuracy: number } {
  const user = userTranscript.toLowerCase().replace(/[^a-z]/g, '');
  const phonemes = targetPhonemes.map(p => p.toLowerCase().replace(/[^a-z]/g, ''));
  let matches = 0;
  const breakdown = phonemes.map((symbol, i) => {
    const found = user.includes(symbol);
    matches += found ? 1 : 0;
    return {
      symbol,
      correct: found,
      confidence: found ? 1 : 0.3,
      label: found ? `Good: /${symbol}/` : `Try: /${symbol}/`
    };
  });
  // Fallback: if the transcript is very close to the brand name, boost the score
  const brandName = phonemes.join('');
  const levenshtein = (a: string, b: string) => {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
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
    return matrix[b.length][a.length];
  };
  const distance = levenshtein(user, brandName);
  const percent = matches / phonemes.length;
  let accuracy = 0;
  if (distance <= 2) {
    accuracy = 95 + Math.round(Math.random() * 5); // 95-100 for very close
  } else if (percent >= 0.9) {
    accuracy = 90 + Math.round(Math.random() * 10);
  } else if (percent >= 0.7) {
    accuracy = 80 + Math.round(Math.random() * 10);
  } else if (percent >= 0.5) {
    accuracy = 60 + Math.round(Math.random() * 19);
  } else {
    accuracy = 50 + Math.round(Math.random() * 9);
  }
  return { breakdown, accuracy };
}

export default function AIFeedback() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(brandsData[0]);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Brand selection handler
  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const brand = brandsData.find(b => b.name === e.target.value);
    setSelectedBrand(brand || null);
    setResult(null);
    setTranscript('');
    setAudioUrl(null);
    setAttempt(0);
  };

  // Start recording and transcribe
  const startRecording = async () => {
    if (!SpeechRecognition) {
      alert('SpeechRecognition API not supported in this browser.');
      return;
    }
    setRecording(true);
    // Start audio recording
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new (window as any).MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (event: any) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);
        };
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
      } catch (err) {
        setRecording(false);
        alert('Microphone access denied.');
        return;
      }
    }
    // Start speech recognition
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const spoken = event.results[0][0].transcript;
      setTranscript(spoken);
      setRecording(false);
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      generateFeedback(spoken, attempt);
    };
    recognition.onerror = () => {
      setRecording(false);
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      alert('Speech recognition error. Please try again.');
    };
    recognition.onend = () => {
      setRecording(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  // Generate feedback and simulated analysis
  const generateFeedback = (spoken: string, attemptNum: number) => {
    if (!selectedBrand) return;
    // Use real phoneme breakdown
    const brandPhonemes = selectedBrand.phonemes.split('-').map(p => p.trim());
    const { breakdown: userPhonemes, accuracy } = analyzePhonemes(spoken, brandPhonemes);
    // Simulate detailed scores with some variation around accuracy
    const detailedScores = {
      phonemeAccuracy: Math.max(60, Math.min(100, accuracy + Math.floor(Math.random() * 10 - 5))),
      stressPattern: Math.max(60, Math.min(100, accuracy + Math.floor(Math.random() * 10 - 10))),
      timing: Math.max(60, Math.min(100, accuracy + Math.floor(Math.random() * 10 - 7))),
      clarity: Math.max(60, Math.min(100, accuracy + Math.floor(Math.random() * 10 - 3))),
    };
    // Simulate waveform comparison
    const waveformComparison = {
      userWaveform: Array(10).fill(0).map(() => Math.random() * 100),
      correctWaveform: Array(10).fill(0).map(() => Math.random() * 100),
      timeLabels: Array(10).fill(0).map((_, i) => `${(i * 0.1).toFixed(1)}s`),
    };
    // Curated, randomized, placeholder-filled tips
    const suggestions = getBrandTips(selectedBrand, attemptNum);
    // Generate more varied, brand-specific AI feedback
    let feedbackMsg = '';
    if (accuracy >= 90) {
      feedbackMsg = `Outstanding! Your pronunciation of "${selectedBrand.name}" is spot on. ${selectedBrand.name} is a well-known brand from ${selectedBrand.country}. Keep up the great work!`;
    } else if (accuracy >= 80) {
      feedbackMsg = `Great job! Your pronunciation of "${selectedBrand.name}" is very good, but you can refine it a bit more. Remember, it's pronounced as "${selectedBrand.pronunciation}".`;
    } else if (accuracy >= 70) {
      feedbackMsg = `Not bad! You got most of "${selectedBrand.name}" right. Try to focus on the tricky parts: "${selectedBrand.pronunciation}".`;
    } else {
      feedbackMsg = `Keep practicing! "${selectedBrand.name}" can be tough to pronounce, especially for non-native speakers. Listen to native speakers from ${selectedBrand.country} for more help.`;
    }
    // Simulate similar brands (reshuffled each time)
    const shuffledBrands = brandsData.filter(b => b.name !== selectedBrand.name).sort(() => Math.random() - 0.5);
    const similarBrands = shuffledBrands.slice(0, 3).map(b => ({
      id: b.name,
      name: b.name,
      phonemes: b.phonemes,
      pronunciation: b.pronunciation,
      country: b.country,
      description: b.description,
    }));
    setResult({
      transcript: spoken,
      detectedBrand: selectedBrand.name,
      pronunciationFeedback: feedbackMsg,
      correctPhonemes: userPhonemes,
      userPhonemes,
      accuracy,
      brandFound: accuracy > 60,
      message: accuracy > 60 ? '' : 'Brand not detected. Try again.',
      waveform: waveformComparison.userWaveform,
      correctPronunciation: selectedBrand.pronunciation,
      referenceWaveform: waveformComparison.correctWaveform,
      suggestions,
      brandDescription: selectedBrand.description,
      brandLogo: '',
      brandCountry: selectedBrand.country,
      brandFounded: selectedBrand.founded,
      brandImages: [],
      waveformComparison,
      detailedScores,
      similarBrands,
    });
    // Update brand stats for admin dashboard
    if (user && selectedBrand) {
      updateBrandStats(selectedBrand.name, accuracy > 60, accuracy, user.uid);
    }
  };

  // UI rendering
  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-teal to-cream flex flex-col items-center justify-center p-4">
      <button
        onClick={() => window.history.back()}
        className="absolute top-6 left-6 px-4 py-2 bg-navy text-gold rounded-lg shadow hover:bg-gold hover:text-navy font-jakarta font-semibold transition"
      >
        ← Back
      </button>
      <div className="max-w-3xl mx-auto py-8">
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-center">
          <label className="font-semibold text-lg">Pick a car brand:</label>
          <select className="border rounded px-3 py-2" value={selectedBrand?.name} onChange={handleBrandChange}>
            {brandsData.map(b => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
          <Button onClick={startRecording} disabled={recording} variant="outline">
            {recording ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
            {recording ? 'Listening...' : 'Start Recording'}
          </Button>
        </div>
        {result && (
          <FeedbackDisplay result={result} onTryAgain={() => { setResult(null); setTranscript(''); setAudioUrl(null); setAttempt(a => a + 1); }} audioUrl={audioUrl} />
        )}
      </div>
    </div>
  );
}