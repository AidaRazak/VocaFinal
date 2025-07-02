import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { brandsData } from '@/data/gamedata';
import { updateUserStreak, updateBrandStats } from '@/lib/utils';
import { getAuth } from 'firebase/auth';

type Question = {
  brand: string;
  options: string[];
  correctAnswer: string;
  audioUrl?: string;
};

const brandNames = Object.keys(brandsData);

const getSpokenBrand = (brandId: string) => {
  return brandId.replace('-', ' ');
};

export default function ListenGuess({ onScoreUpdate }: { onScoreUpdate: (newScore: number) => void }) {
  const { user } = useAuth();
  const [score, setScore] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | ''>('');
  const [answered, setAnswered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (user) {
      const fetchScore = async () => {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const newScore = userDoc.data().gameScore || 0;
          setScore(newScore);
          onScoreUpdate(newScore);
        }
      };
      fetchScore();
    }
    generateQuestion();
    // eslint-disable-next-line
  }, [user]);

  const generateQuestion = () => {
    setAnswered(false);
    setFeedback('');
    setIsPlaying(false);

    const randomBrandName = brandNames[Math.floor(Math.random() * brandNames.length)];
    const incorrectOptions = new Set<string>();
    while (incorrectOptions.size < 2) {
      const randomIncorrect = brandNames[Math.floor(Math.random() * brandNames.length)];
      if (randomIncorrect !== randomBrandName) {
        incorrectOptions.add(randomIncorrect);
      }
    }
    const options = Array.from(incorrectOptions);
    options.push(randomBrandName);
    options.sort(() => Math.random() - 0.5);
    setQuestion({
      brand: randomBrandName,
      options,
      correctAnswer: randomBrandName,
    });
  };

  const playAudio = () => {
    if (!question) return;
    setIsPlaying(true);
    const utterance = new SpeechSynthesisUtterance(getSpokenBrand(question.brand));
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    speechSynthesis.speak(utterance);
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

  const handleAnswer = async (selectedOption: string) => {
    if (answered) return;
    setAnswered(true);
    const isCorrect = selectedOption === question?.correctAnswer;
    if (isCorrect) {
      playClickSound();
      setFeedback('correct');
      const newScore = score + 1;
      setScore(newScore);
      onScoreUpdate(newScore);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const auth = getAuth();
        if (auth.currentUser) {
          try {
            await updateDoc(userDocRef, { gameScore: increment(1) });
          } catch (err) {
            console.warn('Could not update score:', err);
          }
        } else {
          console.warn('Not authenticated: skipping Firestore write');
        }
      }
    } else {
      setFeedback('incorrect');
    }
    if (user && question) {
      const accuracy = isCorrect ? 100 : 0;
      try {
        await updateUserStreak(user.uid, {
          accuracy,
          brandName: question.brand,
          sessionType: 'game',
        });
      } catch (err) {
        console.warn('Could not update streak:', err);
      }
      try {
        await updateBrandStats(question.brand, isCorrect, accuracy);
      } catch (err) {
        console.warn('Could not update brand stats:', err);
      }
    }
    setTimeout(() => {
      generateQuestion();
    }, 1500);
  };

  return (
    <div className="game-container-inner flex flex-col items-center justify-center min-h-[60vh]">
      {question ? (
        <div className="question-card rounded-2xl p-8 shadow-2xl border border-gold/20 max-w-xl w-full animate-fade-in bg-[#10172a] text-white">
          <p className="instruction text-lg text-gold font-semibold mb-4">Listen to the pronunciation and guess the brand:</p>
          <div className="flex flex-col items-center justify-center mt-6 mb-6">
            <button onClick={playAudio} disabled={isPlaying} className="play-sound-btn mb-6 text-3xl bg-gold/20 rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:bg-gold/40 transition">
              {isPlaying ? '🔊' : '🔊'}
            </button>
          </div>
          <div className="options-container listen-game flex flex-row gap-4 justify-center mt-6 flex-wrap">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                disabled={answered}
                className={`option-btn glassmorphic border-2 border-teal rounded-xl px-6 py-4 min-w-[180px] text-lg font-jakarta shadow-md transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-gold focus:outline-none
                  ${answered && option === question.correctAnswer ? 'bg-gold text-navy font-bold shadow-xl' : ''}
                  ${answered && feedback === 'incorrect' && option !== question.correctAnswer ? 'opacity-60' : ''}
                  ${answered ? 'cursor-default' : 'cursor-pointer'}
                `}
              >
                {option}
              </button>
            ))}
          </div>
          {feedback === 'correct' && <p className="feedback-text correct text-green-600 font-bold mt-6 text-xl animate-bounce">Correct! +1 Point</p>}
          {feedback === 'incorrect' && <p className="feedback-text incorrect text-red-500 font-bold mt-6 text-xl">Nice try!</p>}
        </div>
      ) : (
        <p>Loading game...</p>
      )}
    </div>
  );
} 