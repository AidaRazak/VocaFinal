import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { brandsData } from '@/data/gamedata';
import { updateUserStreak, updateBrandStats } from '@/lib/utils';
import { getAuth } from 'firebase/auth';
import { Mic, MicOff } from 'lucide-react';

type GamePhase = 'ready' | 'recording' | 'processing' | 'result';

type ShowdownResult = {
  userScore: number;
  targetScore: number;
  isWin: boolean;
};

const brandNames = Object.keys(brandsData);

export default function PronunciationShowdown({ onScoreUpdate }: { onScoreUpdate: (newScore: number) => void }) {
  const { user } = useAuth();
  const [currentBrand, setCurrentBrand] = useState('');
  const [targetScore, setTargetScore] = useState(0);
  const [gamePhase, setGamePhase] = useState<GamePhase>('ready');
  const [showdownResult, setShowdownResult] = useState<ShowdownResult | null>(null);

  useEffect(() => {
    generateChallenge();
    // eslint-disable-next-line
  }, []);

  const generateChallenge = () => {
    setGamePhase('ready');
    setShowdownResult(null);
    const randomBrandName = brandNames[Math.floor(Math.random() * brandNames.length)];
    const randomTargetScore = Math.floor(Math.random() * 21) + 70; // Target between 70-90
    setCurrentBrand(randomBrandName);
    setTargetScore(randomTargetScore);
  };

  // Helper: Levenshtein distance for string similarity
  function levenshtein(a: string, b: string): number {
    const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }
    return matrix[a.length][b.length];
  }

  // Helper: String similarity percentage
  function stringSimilarity(a: string, b: string): number {
    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 100;
    return Math.round((1 - dist / maxLen) * 100);
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
    const accuracy = Math.round((matches / phonemes.length) * 100);
    return { breakdown, accuracy };
  }

  const handleRecording = () => {
    setGamePhase('recording');
    // Use Web Speech API for local transcription
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser.');
      setGamePhase('ready');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = async (event: any) => {
      setGamePhase('processing');
      const transcript = event.results[0][0].transcript;
      // Analyze transcript against brand phonemes
      const brandPhonemes = brandsData[currentBrand]?.phonemes?.split('-').map((p: string) => p.trim()) || [];
      const { accuracy: phonemeScore } = analyzePhonemes(transcript, brandPhonemes);
      // Also compare transcript to brand name for string similarity
      const brandName = currentBrand.toLowerCase().replace(/[^a-z]/g, '');
      const transcriptNorm = transcript.toLowerCase().replace(/[^a-z]/g, '');
      const stringScore = stringSimilarity(transcriptNorm, brandName);
      // Final score: weighted average, add random variation, clamp to 60-100 for good matches
      let rawScore = Math.round((phonemeScore + stringScore) / 2);
      // Add a small random variation for naturalness
      if (rawScore >= 50) {
        rawScore += Math.floor(Math.random() * 10); // +0 to +9
      }
      // Clamp to 60-100 for reasonable matches
      let userScore = rawScore;
      if (rawScore >= 50) userScore = Math.max(60, Math.min(100, rawScore));
      else userScore = Math.max(0, Math.min(59, rawScore));
      const isWin = userScore >= targetScore;
      setShowdownResult({ userScore, targetScore, isWin });
      setGamePhase('result');
      if (isWin && user) {
        const userDocRef = doc(db, 'users', user.uid);
        const auth = getAuth();
        if (auth.currentUser) {
          await updateDoc(userDocRef, { gameScore: increment(5) });
        } else {
          console.warn('Not authenticated: skipping Firestore write');
        }
        const userDoc = await getDoc(userDocRef);
        if(userDoc.exists()) {
          onScoreUpdate(userDoc.data().gameScore || 0);
        }
      }
      if (user) {
        try {
          await updateUserStreak(user.uid, {
            accuracy: userScore,
            brandName: currentBrand,
            sessionType: 'game',
          });
        } catch (err) {
          console.warn('Could not update streak:', err);
        }
        try {
          await updateBrandStats(currentBrand, isWin, userScore, user.uid);
        } catch (err) {
          console.warn('Could not update brand stats:', err);
        }
      }
      if (isWin) {
        playClickSound();
      }
    };
    recognition.onerror = (event: any) => {
      alert('Speech recognition error: ' + event.error);
      setGamePhase('ready');
    };
    recognition.onend = () => {
      if (gamePhase === 'recording') setGamePhase('ready');
    };
    recognition.start();
  };

  const playClickSound = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = 420;
    g.gain.value = 0.15;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.12);
    o.onended = () => ctx.close();
  };

  const renderContent = () => {
    if (gamePhase === 'result' && showdownResult) {
      return (
        <div className="result-card">
          <h2>{showdownResult.isWin ? 'You Won!' : 'Nice Try!'}</h2>
          <p>Your Score: <span className={showdownResult.isWin ? 'win' : 'loss'}>{showdownResult.userScore}%</span></p>
          <p>Target Score: {showdownResult.targetScore}%</p>
          {showdownResult.isWin && <p className="points-win">+5 Points!</p>}
          <button onClick={generateChallenge} className="option-btn glassmorphic border border-teal rounded-xl px-6 py-4 min-w-[180px] text-lg font-jakarta shadow-md transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-gold focus:outline-none mt-6">Play Again</button>
        </div>
      );
    }
    return (
      <div className="challenge-card">
        <p className="instruction">Pronounce the following brand and beat the target score:</p>
        <h2 className="brand-name">{currentBrand}</h2>
        <div className="target-score">Target: <strong>{targetScore}%</strong></div>
        <div className="flex flex-col items-center justify-center mt-6 mb-6">
          {gamePhase === 'ready' ? (
            <button
              onClick={handleRecording}
              disabled={gamePhase !== 'ready'}
              className="h-20 w-20 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center shadow-lg transition-all duration-200 focus:ring-2 focus:ring-gold focus:outline-none"
              style={{ fontSize: 32 }}
              title="Start Recording"
            >
              <Mic className="w-10 h-10 text-white" />
            </button>
          ) : gamePhase === 'recording' ? (
            <button
              disabled
              className="h-20 w-20 rounded-full bg-red-500 animate-pulse flex items-center justify-center shadow-lg transition-all duration-200"
              style={{ fontSize: 32 }}
              title="Recording..."
            >
              <MicOff className="w-10 h-10 text-white" />
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="game-container-inner flex flex-col items-center justify-center min-h-[60vh]">
      <div className="showdown-card rounded-2xl p-8 shadow-2xl border border-gold/20 max-w-xl w-full animate-fade-in bg-[#10172a] text-white">
        <h2 className="text-3xl font-bold text-gold mb-4 font-playfair">Pronunciation Showdown</h2>
        <p className="text-lg text-navy font-semibold mb-6">Say the brand name as clearly as you can!</p>
        {renderContent()}
      </div>
    </div>
  );
} 