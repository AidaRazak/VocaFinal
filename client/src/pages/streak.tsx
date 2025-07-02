import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface StreakData {
  streakCount: number;
  lastPlayedDate: string;
  activeDays: string[];
  totalSessions: number;
  brandsLearned: number;
  averageAccuracy: number;
}

export default function StreakPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [streakData, setStreakData] = useState<StreakData>({
    streakCount: 0,
    lastPlayedDate: '',
    activeDays: [],
    totalSessions: 0,
    brandsLearned: 0,
    averageAccuracy: 0
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (user) {
      fetchStreakData();
    }
    // eslint-disable-next-line
  }, [user]);

  const fetchStreakData = async () => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      setStreakData({
        streakCount: data.streakCount || 0,
        lastPlayedDate: data.lastPlayedDate || '',
        activeDays: data.activeDays || [],
        totalSessions: data.totalSessions || 0,
        brandsLearned: data.brandsLearned || 0,
        averageAccuracy: data.averageAccuracy || 0
      });
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek };
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-CA');
  };

  const isActiveDay = (day: number) => {
    const dateStr = formatDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    return streakData.activeDays.includes(dateStr);
  };

  const getPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const getNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);

  const handleBack = () => setLocation('/dashboard');

  return (
    <div className="streak-page min-h-screen flex flex-col items-center justify-center bg-navy/90 p-4">
      <h1 className="page-title text-4xl font-bold mb-6 text-gold font-playfair animate-fade-in">Your Streak</h1>
      <div className="streak-container w-full max-w-3xl glassmorphic rounded-2xl shadow-xl border border-gold p-6 animate-fade-in">
        <div className="streak-card glassmorphic bg-gold/30 border border-gold rounded-xl p-6 mb-6 text-center shadow-lg">
          <div className="streak-number text-5xl font-bold text-gold mb-2 font-playfair animate-bounce-slow">{streakData.streakCount}</div>
          <h3 className="text-xl text-navy font-semibold mb-1">Day Streak</h3>
          <p className="text-navy">Keep it up! You're doing great.</p>
        </div>
        <div className="stats-grid grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="stat-card glassmorphic bg-cream/60 border border-teal rounded-lg p-4 text-center shadow-md">
            <h4 className="text-lg text-teal font-semibold mb-1">Total Practice</h4>
            <div className="stat-number text-2xl font-bold text-navy mb-1">{streakData.totalSessions}</div>
            <p className="text-navy">sessions</p>
          </div>
          <div className="stat-card glassmorphic bg-cream/60 border border-gold rounded-lg p-4 text-center shadow-md">
            <h4 className="text-lg text-gold font-semibold mb-1">Brands Learned</h4>
            <div className="stat-number text-2xl font-bold text-navy mb-1">{streakData.brandsLearned}</div>
            <p className="text-navy">brands</p>
          </div>
          <div className="stat-card glassmorphic bg-cream/60 border border-navy rounded-lg p-4 text-center shadow-md">
            <h4 className="text-lg text-navy font-semibold mb-1">Accuracy</h4>
            <div className="stat-number text-2xl font-bold text-teal mb-1">{Number(streakData.averageAccuracy).toFixed(1)}%</div>
            <p className="text-navy">average</p>
          </div>
        </div>
        {/* Calendar Section */}
        <div className="calendar-section">
          <div className="calendar-header flex items-center justify-between mb-2">
            <button className="nav-btn text-gold text-xl hover:text-gold-light flex items-center" onClick={getPreviousMonth}>
              <FaChevronLeft />
            </button>
            <h3 className="text-lg font-bold text-navy font-playfair">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
            <button className="nav-btn text-gold text-xl hover:text-gold-light flex items-center" onClick={getNextMonth}>
              <FaChevronRight />
            </button>
          </div>
          <div className="calendar-grid">
            <div className="calendar-weekdays grid grid-cols-7 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="weekday text-cream font-semibold text-center">{day}</div>
              ))}
            </div>
            <div className="calendar-days grid grid-cols-7 gap-1">
              {Array.from({ length: startingDayOfWeek }, (_, i) => (
                <div key={`empty-${i}`} className="calendar-day empty"></div>
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const isActive = isActiveDay(day);
                return (
                  <div 
                    key={day} 
                    className={`calendar-day rounded-md p-1 text-center font-jakarta ${isActive ? 'bg-gold text-navy font-bold shadow-md' : 'bg-cream/40 text-navy'}`}
                    title={isActive ? 'Practiced' : 'No activity'}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="action-buttons flex justify-center mt-6">
          <button onClick={handleBack} className="practice-btn bg-teal text-cream px-6 py-2 rounded-lg font-semibold shadow hover:bg-teal/80 transition-colors">
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
} 