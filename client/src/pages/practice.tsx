import { useState, useEffect, useRef } from 'react';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Search, Mic, MicOff, Volume2, Trophy, Target, Clock, RotateCcw, Home, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import brandsData from '@/data/brands.json';

// Helper icons
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg>;
const CrossIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>;
const LightbulbIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"></path></svg>;

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
}

interface Brand {
  name: string;
  pronunciation: string;
  phonemes: string;
  country: string;
  founded: string;
  description: string;
}

const WaveformVisualizer = ({ waveformData }: { waveformData: number[] }) => {
  if (!waveformData || waveformData.length === 0) {
    return <div className="h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">No audio data to display</div>;
  }
  const maxVal = Math.max(...waveformData);
  return (
    <div className="flex items-end justify-center gap-1 h-16 px-4">
      {waveformData.map((val, i) => (
        <div 
          key={i} 
          className="bg-blue-500 w-1 rounded-t-sm min-h-1"
          style={{ height: `${(val / maxVal) * 100}%` }}
        />
      ))}
    </div>
  );
};

// Helper: Normalize brand name for matching
function normalizeBrand(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Helper: Fuzzy match to suggest closest brand(s)
function getClosestBrands(input: string, allBrands: Brand[], maxDistance = 3): Brand[] {
  const normInput = normalizeBrand(input);
  let best: Brand[] = [];
  let minDist = Infinity;
  for (const brand of allBrands) {
    const dist = levenshteinDistance(normInput, normalizeBrand(brand.name));
    if (dist < minDist) {
      minDist = dist;
      best = [brand];
    } else if (dist === minDist) {
      best.push(brand);
    }
  }
  return minDist <= maxDistance ? best : [];
}

// Simple Levenshtein distance implementation
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

const FeedbackDisplay = ({ result, onTryAgain, audioUrl }: { result: TranscriptionResult, onTryAgain: () => void, audioUrl?: string }) => {
  if (!result) return null;

  const incorrectPhonemes = result.userPhonemes
    ?.map((userP, i) => ({ ...userP, correctSymbol: result.correctPhonemes?.[i]?.symbol }))
    .filter(p => !p.correct && p.correctSymbol) || [];

  const hasPhonemeData = Array.isArray(result.userPhonemes) && result.userPhonemes.length > 0;
  const accuracy = typeof result.accuracy === 'number' ? result.accuracy : 0;

  const getAiSummary = () => {
    if (!hasPhonemeData || accuracy === 0) return "We couldn't analyze your pronunciation. Please try again with a clearer recording.";
    if (accuracy >= 95) return "Exceptional work! Your pronunciation is nearly perfect. A model for others to follow.";
    if (accuracy > 80) return `Great job! You have a strong grasp of the pronunciation. A little refinement on the highlighted sounds will make it perfect.`;
    if (accuracy > 60) return "A good attempt. You have the basics down, but some key sounds are off. Focus on the tips below to see a big improvement.";
    return "There's room for improvement. Let's break down the sounds and work on them one by one. You can do this!";
  };

  // Create a mock reference waveform for demonstration
  const referenceWaveform = result.referenceWaveform || (result.waveform && result.waveform.map((v, i) => (i % 2 === 0 ? v : Math.max(1, v - 10))));

  const suggestions = result.suggestions || [];

  return (
    <><h1 style={{ color: 'red' }}></h1><div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-8">
    
        <Button
          onClick={onTryAgain}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </Button>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-navy-900 mb-2 tracking-tight">Pronunciation Report</h2>
        {result.brandFound && <p className="text-lg text-navy-700">Results for <span className="font-semibold">{result.detectedBrand}</span></p>}
        {result.transcript && (
          <Card className="mt-4">
            <CardContent className="pt-4">
              <strong>Transcript:</strong> <span className="italic">{result.transcript}</span>
            </CardContent>
          </Card>
        )}
        {typeof audioUrl === 'string' && (
          <div className="mt-4">
            <audio controls src={audioUrl} className="mx-auto" />
            <div className="text-sm text-gray-500 mt-1">Your recording</div>
          </div>
        )}
      </div>

      {/* Brand Not Found */}
      {!result.brandFound ? (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-xl font-bold text-red-600 mb-4">Brand Not Found</h3>
            <p className="text-gray-700 mb-2">Your transcription: <span className="italic">{result.transcript}</span></p>
            <p className="text-red-500 font-semibold mb-4">{result.message || 'We could not identify the car brand you mentioned.'}</p>
            {suggestions.length > 0 && (
              <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                <p className="font-semibold text-yellow-800 mb-2">Did you mean:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s, i) => <span key={i} className="bg-yellow-200 rounded px-2 py-1 font-bold text-yellow-900">{s}</span>)}
                </div>
              </div>
            )}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Your Pronunciation Waveform</h3>
              <div className="bg-slate-100 rounded-xl p-4">
                <WaveformVisualizer waveformData={result.waveform || []} />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Score Card */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-2xl font-bold text-navy-900 mb-6 text-center">Overall Score</h3>
              <div className="flex flex-col items-center space-y-4">
                <div className="relative flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-blue-600 to-blue-300 flex items-center justify-center shadow-lg">
                    <span className="text-4xl font-extrabold text-white drop-shadow-lg">{accuracy}<span className="text-xl align-super">%</span></span>
                  </div>
                </div>
                <div className="text-center max-w-2xl">
                  <div className="text-base italic text-navy-700 bg-blue-50 rounded-lg px-4 py-3">
                    <span className="font-bold text-blue-700">AI Coach:</span> {getAiSummary()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Phoneme Breakdown Card */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-2xl font-bold text-navy-900 mb-4">Phoneme Breakdown</h3>
              <p className="text-gray-600 mb-6">Comparing your sounds to the correct pronunciation.</p>
              {!hasPhonemeData ? (
                <div className="text-red-500 font-semibold">No phoneme data available.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="px-4 py-3 text-left text-navy-800 text-base font-semibold rounded-l-xl">Expected</th>
                        <th className="px-4 py-3 text-center text-navy-800 text-base font-semibold">Status</th>
                        <th className="px-4 py-3 text-right text-navy-800 text-base font-semibold rounded-r-xl">You Said</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.correctPhonemes?.map((correctP, i) => {
                        const userP = result.userPhonemes?.[i];
                        const isCorrect = userP?.correct ?? false;
                        return (
                          <tr key={i} className="bg-white hover:bg-blue-50 transition-all">
                            <td className="px-4 py-3 font-mono text-lg text-blue-900 font-bold rounded-l-xl">{correctP.symbol}</td>
                            <td className="px-4 py-3 text-center">
                              {isCorrect ? <span className="text-green-500 text-2xl">✅</span> : <span className="text-red-500 text-2xl">❌</span>}
                            </td>
                            <td className={`px-4 py-3 font-mono text-lg font-bold rounded-r-xl ${!isCorrect ? 'text-red-600 line-through' : 'text-blue-900'}`}>{userP?.symbol || '?'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Improvement Tips Card */}
          <Card className="bg-yellow-50 border-l-4 border-yellow-400">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <LightbulbIcon />
                <h3 className="text-2xl font-bold text-yellow-700">Improvement Tips</h3>
              </div>
              {(!hasPhonemeData || accuracy === 0) ? (
                <p className="text-red-500 font-semibold">No feedback available. Please try again with a clearer recording.</p>
              ) : incorrectPhonemes.length > 0 ? (
                <div className="space-y-3">
                  {incorrectPhonemes.map((p, i) => (
                    <div key={i} className="bg-yellow-100 rounded-lg px-4 py-3 text-yellow-900">
                      You said <span className="font-mono font-bold text-red-600">{p.symbol}</span> instead of <span className="font-bold text-blue-700">{p.correctSymbol}</span>. Focus on the correct tongue and lip placement for this sound.
                    </div>
                  ))}
                </div>
              ) : (
                accuracy >= 95 ? (
                  <p className="text-green-600 font-semibold text-lg">✨ Excellent work! Your pronunciation was perfect. Keep practicing!</p>
                ) : null
              )}
            </CardContent>
          </Card>

          {/* Waveform Comparison Card */}
          <Card className="bg-slate-800 text-white">
            <CardContent className="pt-6">
              <h3 className="text-2xl font-bold text-white mb-6">Waveform Comparison</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="font-semibold text-slate-200 mb-3">Reference Pronunciation</div>
                  <div className="bg-slate-700 rounded-xl p-4">
                    <WaveformVisualizer waveformData={referenceWaveform || []} />
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-slate-200 mb-3">Your Pronunciation</div>
                  <div className="bg-slate-700 rounded-xl p-4">
                    <WaveformVisualizer waveformData={result.waveform || []} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Button */}
      <div className="text-center">
        <Button onClick={onTryAgain} size="lg" className="bg-blue-600 hover:bg-blue-700">
          <RotateCcw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div></>
  );
};

export default function Practice() {
  const { user } = useFirebaseAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [brandInput, setBrandInput] = useState('');

  const brands = brandsData as Brand[];
  const filteredBrands = brands.filter(brand => 
    brand.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startRecording = async () => {
    if (!selectedBrand) {
      toast({
        title: "Select a brand first",
        description: "Please choose a car brand to practice pronouncing.",
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Recording started",
        description: `Say "${selectedBrand.name}" clearly into your microphone.`,
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording failed",
        description: "Could not access your microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    const brandToSend = brandInput.trim();
    if (!brandToSend) {
      toast({
        title: "Brand required",
        description: "Please type a car brand name before recording.",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }
    setIsProcessing(true);
    try {
      console.log('Processing audio with Azure Speech Services...');
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('brand', brandToSend);
      const response = await fetch('/api/pronunciation/azure', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const apiResult = await response.json();
      console.log('Azure Speech response:', apiResult);

      // Map the API response to our result interface
      if (!selectedBrand) {
        // This should not happen, but add a fallback to prevent errors
        setResult(null);
        toast({
          title: "No brand selected",
          description: "Please select a car brand before recording.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }
      const processedResult: TranscriptionResult = {
        transcript: apiResult.transcript || '',
        detectedBrand: apiResult.detectedBrand || selectedBrand.name,
        brandFound: apiResult.brandFound || false,
        accuracy: apiResult.accuracy || 0,
        correctPhonemes: (selectedBrand.phonemes as string).split('-').map((p: string) => ({ 
          symbol: p.trim(), 
          correct: true 
        })),
        userPhonemes: apiResult.userPhonemes || [],
        waveform: Array.from({ length: 50 }, () => Math.random() * 100), // Mock waveform
        brandDescription: selectedBrand.description,
        brandCountry: selectedBrand.country,
        brandFounded: selectedBrand.founded,
        message: apiResult.message || (apiResult.brandFound ? "Brand detected successfully!" : "Brand not found in your pronunciation."),
        suggestions: apiResult.suggestions || [],
        pronunciationFeedback: apiResult.pronunciationFeedback || "Try speaking more clearly."
      };

      setResult(processedResult);
      
      toast({
        title: "Analysis complete!",
        description: `Your pronunciation accuracy: ${processedResult.accuracy}%`,
      });
    } catch (error) {
      console.error('Error processing audio:', error);
      
      // Provide more specific error messages
      let errorMessage = "Could not analyze your pronunciation. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = "Network error. Please check your internet connection.";
        } else if (error.message.includes('API request failed')) {
          errorMessage = "Speech analysis service is currently unavailable. Please try again later.";
        } else if (error.message.includes('Azure Speech credentials')) {
          errorMessage = "Speech analysis service is not configured. Please contact support.";
        }
      }
      
      toast({
        title: "Processing failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const playBrandPronunciation = (brand: Brand) => {
    // Use Web Speech API for pronunciation
    if ('speechSynthesis' in window) {
      // Stop any current speech
      window.speechSynthesis.cancel();
      
      // Create new utterance
      const utterance = new SpeechSynthesisUtterance(brand.name);
      utterance.rate = 0.6; // Slower for better pronunciation
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      // Add event listeners
      utterance.onstart = () => {
        console.log('Speech started for:', brand.name);
      };
      
      utterance.onerror = (event) => {
        console.error('Speech error:', event);
        toast({
          title: "Audio playback failed",
          description: "Could not play pronunciation. Please try again.",
          variant: "destructive",
        });
      };
      
      // Speak the brand name
      window.speechSynthesis.speak(utterance);
      
      toast({
        title: "Playing pronunciation",
        description: `"${brand.name}" - ${brand.pronunciation}`,
      });
    } else {
      toast({
        title: "Audio not supported",
        description: "Your browser doesn't support text-to-speech.",
        variant: "destructive",
      });
    }
  };

  const resetPractice = () => {
    setResult(null);
    setAudioUrl('');
    setSelectedBrand(null);
    setSearchTerm('');
  };

  if (result) {
    return <FeedbackDisplay result={result} onTryAgain={resetPractice} audioUrl={audioUrl} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-teal to-cream flex flex-col items-center justify-center p-4">
      <button
        onClick={() => window.history.back()}
        className="absolute top-6 left-6 px-4 py-2 bg-navy text-gold rounded-lg shadow hover:bg-gold hover:text-navy font-jakarta font-semibold transition"
      >
        ← Back
      </button>
      <div className="w-full max-w-xl bg-[#232946] rounded-2xl shadow-2xl border border-gold/30 p-12 flex flex-col items-center animate-fade-in">
        <h2 className="text-4xl font-playfair font-bold text-gold mb-10 tracking-tight">Practice Pronunciation</h2>
        <form className="flex flex-col md:flex-row items-center gap-8 w-full justify-center mb-6">
          <label className="text-xl font-jakarta text-white font-semibold mb-2 md:mb-0" htmlFor="brand-select">Pick a car brand:</label>
          <select
            id="brand-select"
            value={selectedBrand?.name || ''}
            onChange={e => {
              const brand = brands.find(b => b.name === e.target.value);
              setSelectedBrand(brand || null);
            }}
            className="rounded-lg px-5 py-3 bg-navy text-gold border border-gold focus:ring-2 focus:ring-gold focus:outline-none font-jakarta text-lg shadow"
          >
            {brands.map((brand) => (
              <option key={brand.name} value={brand.name}>{brand.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 px-8 py-3 rounded-lg bg-gold text-navy font-jakarta font-semibold shadow hover:bg-cream hover:text-gold transition text-lg"
          >
            <span role="img" aria-label="microphone">🎤</span> {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
        </form>
        {/* Feedback/results UI here */}
      </div>
    </div>
  );
}