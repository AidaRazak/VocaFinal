import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [gameScore, setGameScore] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (!db || !user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGameScore(data.gameScore || 0);
        setStreakCount(data.streakCount || 0);
        setUsername(data.username || user.displayName || 'User');
      } else {
        setUsername(user.displayName || 'User');
      }
    });
    return () => unsubscribe();
  }, [user, db]);

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/');
    }
  }, [user, loading, setLocation]);

  const handleLogout = async () => {
    if (!logout) {
      console.error('Logout error: Auth service not available.');
      return;
    }
    try {
      await logout();
      setLocation('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen min-h-screen bg-gradient-to-br from-navy to-teal flex flex-col items-center justify-center text-white font-jakarta">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-teal to-cream flex flex-col items-center justify-center p-4">
      <button
        onClick={() => window.history.back()}
        className="absolute top-6 left-6 px-4 py-2 bg-navy text-gold rounded-lg shadow hover:bg-gold hover:text-navy font-jakarta font-semibold transition"
      >
        ← Back
      </button>
      {/* Header with Streak */}
      <div className="w-full flex justify-center pt-8 pb-6">
        <button
          className="flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-gold to-gold-light text-navy font-bold text-xl shadow-xl border-2 border-gold/20 glassmorphic hover:scale-105 transition-all duration-200"
          onClick={() => setLocation('/streak')}
          aria-label="View streak"
        >
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/90 shadow-lg text-2xl">🔥</span>
          <span className="text-2xl font-bold">{streakCount}</span>
        </button>
      </div>

      <div className="px-6 pb-32">
        {/* Welcome Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl mb-6 text-navy font-bold font-playfair">
            Welcome back, {username}
          </h1>
          <p className="text-xl md:text-2xl text-teal max-w-2xl text-center mx-auto leading-relaxed">
            Ready to master car brand pronunciations? Choose your learning path below.
          </p>
        </div>

        {/* Practice Section */}
        <div className="text-center mb-20">
          <div className="glassmorphic rounded-3xl p-8 md:p-12 max-w-4xl mx-auto bg-white/60 backdrop-blur-lg border border-gold/20 shadow-2xl">
            <h2 className="text-4xl md:text-5xl mb-6 text-navy font-bold font-playfair">Practice Pronunciation</h2>
            <p className="text-lg md:text-xl text-teal max-w-xl text-center mb-10 mx-auto leading-relaxed">
              Practice your car brand pronunciation and get instant AI feedback with detailed phoneme analysis.
            </p>
            <Link href="/search">
              <Button className="px-10 py-4 rounded-full bg-navy hover:bg-teal text-gold border-2 border-gold text-xl font-semibold transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl">
                Start Learning
              </Button>
            </Link>
          </div>
        </div>

        {/* Game Section */}
        <div className="text-center mb-20">
          <div className="glassmorphic rounded-3xl p-8 md:p-12 max-w-4xl mx-auto bg-white/60 backdrop-blur-lg border border-gold/20 shadow-2xl">
            <h2 className="text-4xl md:text-5xl mb-6 text-navy font-bold font-playfair">Game Arcade</h2>
            <p className="text-lg md:text-xl text-teal max-w-xl text-center mb-10 mx-auto leading-relaxed">
              Test your knowledge in our fun educational games and challenge yourself!
            </p>
            <Link href="/game">
              <Button className="px-10 py-4 rounded-full bg-navy hover:bg-teal text-gold border-2 border-gold text-xl font-semibold transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl mb-8">
                Play Games
              </Button>
            </Link>
            <div className="text-2xl font-bold mt-8 text-navy">
              High Score: <span className="text-gold">{gameScore}</span>
            </div>
          </div>
        </div>
        {/* Streak Button */}
        <div className="w-full flex justify-center pb-8">
          <Button
            className="flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-gold to-gold-light text-navy font-bold text-xl shadow-xl border-2 border-gold/20 glassmorphic hover:scale-105 transition-all duration-200"
            onClick={() => setLocation('/streak')}
            aria-label="View streak"
          >
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/90 shadow-lg text-2xl">🔥</span>
            <span className="text-2xl font-bold">Streak</span>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed inset-x-0 bottom-0 flex justify-center py-6 bg-white/80 backdrop-blur-md z-20 border-t border-gold/20 glassmorphic">
        <Button
          onClick={handleLogout}
          className="px-8 py-3 rounded-full bg-navy hover:bg-teal text-gold font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-gold"
        >
          Logout
        </Button>
      </div>
    </div>
  );
}