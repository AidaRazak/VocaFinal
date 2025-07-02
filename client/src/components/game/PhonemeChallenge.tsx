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
};

export default function PhonemeChallenge({ onScoreUpdate }: { onScoreUpdate: (newScore: number) => void }) {
  const { user } = useAuth();
  const [score, setScore] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | ''>('');
  const [answered, setAnswered] = useState(false);
  const brandNames = Object.keys(brandsData);

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

    const randomBrandName = brandNames[Math.floor(Math.random() * brandNames.length)];
    const correctAnswer = brandsData[randomBrandName].phonemes;

    const incorrectOptions = new Set<string>();
    while (incorrectOptions.size < 2) {
      const randomIncorrect = brandNames[Math.floor(Math.random() * brandNames.length)];
      if (randomIncorrect !== randomBrandName) {
        incorrectOptions.add(brandsData[randomIncorrect].phonemes);
      }
    }

    const options = Array.from(incorrectOptions);
    options.push(correctAnswer);
    options.sort(() => Math.random() - 0.5);

    setQuestion({
      brand: randomBrandName,
      options,
      correctAnswer,
    });
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
      <div className="challenge-card rounded-2xl p-8 shadow-2xl border border-gold/20 max-w-xl w-full animate-fade-in bg-[#10172a] text-white">
        <p className="instruction text-lg text-gold font-semibold mb-4">Select the correct phoneme for the highlighted sound:</p>
        <div className="phoneme-question text-3xl font-bold text-navy mb-6 font-playfair bg-gold/10 rounded-xl px-6 py-4 shadow-md inline-block">
          {question?.brand}
        </div>
        <div className="options-container flex flex-row gap-4 justify-center mt-6 flex-wrap">
          {question?.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(option)}
              disabled={answered}
              className={`option-btn glassmorphic border-2 border-teal rounded-xl px-6 py-4 min-w-[120px] text-lg font-jakarta shadow-md transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-gold focus:outline-none
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
        {feedback === 'incorrect' && <p className="feedback-text incorrect text-red-500 font-bold mt-6 text-xl">Try again!</p>}
        <div className="flex flex-col items-center justify-center mt-6 mb-6">
          {/* existing recording button code here */}
        </div>
      </div>
    </div>
  );
} 