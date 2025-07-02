import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { getAuth } from 'firebase/auth';
// Import the game components (to be created next)
import PhonemeChallenge from '../components/game/PhonemeChallenge';
import ListenGuess from '../components/game/ListenGuess';
import PronunciationShowdown from '../components/game/PronunciationShowdown';
import brandsData from '../data/brands.json';

// GameMode type
const GAME_MODES = [
  { key: 'phoneme-challenge', label: 'Phoneme Challenge', description: 'Match the brand to its phonemes.' },
  { key: 'listen-guess', label: 'Listen & Guess', description: 'Guess the brand from an AI voice.' },
  { key: 'pronunciation-showdown', label: 'AI Pronunciation Showdown', description: 'Beat the AI\'s target score.' },
];

type GameMode = 'menu' | 'phoneme-challenge' | 'listen-guess' | 'pronunciation-showdown';

export default function GamePage() {
  const { user } = useAuth();
  const [userScore, setUserScore] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [sessionStarted, setSessionStarted] = useState(false);

  useEffect(() => {
    if (!db || !user) return;
    const fetchScore = async () => {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        setUserScore(userDoc.data().gameScore || 0);
      } else {
        const auth = getAuth();
        if (auth.currentUser) {
          await setDoc(userDocRef, { gameScore: 0 });
        } else {
          console.warn('Not authenticated: skipping Firestore write');
        }
        setUserScore(0);
      }
    };
    fetchScore();
    setSessionStarted(false);
  }, [user, db]);

  const handleStartGameSession = async () => {
    if (!sessionStarted && user) {
      setSessionStarted(true);
      // Optionally update streak/session here
    }
  };

  const handleScoreUpdate = (newScore: number) => {
    setUserScore(newScore);
  };

  const renderGameMode = () => {
    switch (gameMode) {
      case 'phoneme-challenge':
        handleStartGameSession();
        return <PhonemeChallenge onScoreUpdate={handleScoreUpdate} />;
      case 'listen-guess':
        handleStartGameSession();
        return <ListenGuess onScoreUpdate={handleScoreUpdate} />;
      case 'pronunciation-showdown':
        handleStartGameSession();
        return <PronunciationShowdown onScoreUpdate={handleScoreUpdate} />;
      default:
        return (
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2 text-navy">Game Arcade</h1>
            <p className="mb-8 text-lg text-teal">Select a game to play</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {GAME_MODES.map((mode) => (
                <button key={mode.key} onClick={() => setGameMode(mode.key as GameMode)} className="game-card border-2 border-gold rounded-2xl p-8 shadow-xl hover:scale-105 hover:border-teal hover:bg-gold/10 transition-transform duration-200 text-white bg-[#10172a] flex flex-col items-center group">
                  <h3 className="text-2xl font-bold text-gold mb-3 font-playfair group-hover:text-white transition">{mode.label}</h3>
                  <p className="text-base text-white font-jakarta group-hover:text-gold transition">{mode.description}</p>
                </button>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="game-container min-h-screen bg-gradient-to-br from-navy via-teal to-cream text-white flex flex-col items-center justify-center p-4 font-jakarta">
      <div className="w-full max-w-4xl rounded-2xl shadow-xl border border-gold animate-fade-in bg-[#1a2236]">
        <button
          onClick={() => window.history.back()}
          className="absolute top-6 left-6 px-4 py-2 bg-navy text-gold rounded-lg shadow hover:bg-gold hover:text-navy font-jakarta font-semibold transition"
        >
          ← Back
        </button>
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => setGameMode('menu')}
            className={`text-lg transition-colors ${gameMode !== 'menu' ? 'hover:text-gold' : 'text-gray-500 cursor-default'}`}
            disabled={gameMode === 'menu'}
          >
            &larr; Back to Arcade
          </button>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gold">Total Score: {userScore}</h2>
            <Link href="/dashboard" className="text-sm hover:underline text-gold">Back to Dashboard</Link>
          </div>
        </div>
        {gameMode === 'menu' ? (
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white font-playfair drop-shadow-lg">Game Arcade</h1>
            <p className="mb-10 text-xl md:text-2xl text-white font-jakarta font-semibold">Select a game to play</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {GAME_MODES.map((mode) => (
                <button key={mode.key} onClick={() => setGameMode(mode.key as GameMode)} className="game-card border-2 border-gold rounded-2xl p-8 shadow-xl hover:scale-105 hover:border-teal hover:bg-gold/10 transition-transform duration-200 text-white bg-[#10172a] flex flex-col items-center group">
                  <h3 className="text-2xl font-bold text-gold mb-3 font-playfair group-hover:text-white transition">{mode.label}</h3>
                  <p className="text-base text-white font-jakarta group-hover:text-gold transition">{mode.description}</p>
                </button>
              ))}
            </div>
          </div>
        ) : renderGameMode()}
      </div>
    </div>
  );
} 