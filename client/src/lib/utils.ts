import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { doc, updateDoc, getDoc, setDoc, increment } from "firebase/firestore";
import { db } from "./firebase";
import { getAuth } from "firebase/auth";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Update the user's streak and stats in Firestore
export async function updateUserStreak(
  userId: string,
  {
    accuracy,
    brandName,
    sessionType,
  }: { accuracy?: number; brandName?: string; sessionType?: string }
) {
  if (!userId) return;
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA');

  if (!userSnap.exists()) {
    const auth = getAuth();
    if (auth.currentUser) {
      await setDoc(userRef, {
        streakCount: 1,
        lastPracticeDate: today,
        totalSessions: 1,
        brandsLearned: brandName ? 1 : 0,
        averageAccuracy: accuracy || 0,
        currentStreak: 1,
        longestStreak: 1,
        activeDays: [todayStr],
      });
    } else {
      console.warn('Not authenticated: skipping Firestore write');
    }
    return;
  }

  const userData = userSnap.data();
  const lastPracticeDate = userData.lastPracticeDate ? new Date(userData.lastPracticeDate) : null;
  const lastPracticeStr = lastPracticeDate ? lastPracticeDate.toLocaleDateString('en-CA') : null;
  let newStreak = userData.currentStreak || 1;
  let newLongest = userData.longestStreak || 1;
  let activeDays = userData.activeDays || [];
  if (!activeDays.includes(todayStr)) activeDays.push(todayStr);

  // Calculate if today is consecutive
  let isConsecutive = false;
  if (lastPracticeDate) {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');
    isConsecutive = lastPracticeStr === yesterdayStr;
  }

  if (lastPracticeStr === todayStr) {
    // Already played today, don't increment streak
    newStreak = userData.currentStreak || 1;
  } else if (isConsecutive) {
    newStreak = (userData.currentStreak || 1) + 1;
    if (newStreak > newLongest) newLongest = newStreak;
  } else {
    newStreak = 1;
  }

  const auth = getAuth();
  if (auth.currentUser) {
    await updateDoc(userRef, {
      lastPracticeDate: today,
      totalSessions: increment(1),
      brandsLearned: brandName ? increment(1) : userData.brandsLearned || 0,
      averageAccuracy:
        ((userData.averageAccuracy || 0) * (userData.totalSessions || 0) + (accuracy || 0)) /
        ((userData.totalSessions || 0) + 1),
      currentStreak: newStreak,
      longestStreak: newLongest,
      streakCount: newStreak,
      activeDays,
    });
  } else {
    console.warn('Not authenticated: skipping Firestore write');
  }
}

export async function updateBrandStats(brand: string, isCorrect: boolean, accuracy: number, userId?: string) {
  const brandRef = doc(db, "brandStats", brand);
  const brandSnap = await getDoc(brandRef);

  if (!brandSnap.exists()) {
    const auth = getAuth();
    if (auth.currentUser) {
      await setDoc(brandRef, {
        practiced: 1,
        correct: isCorrect ? 1 : 0,
        avgAccuracy: accuracy,
        totalAccuracy: accuracy,
      });
    } else {
      console.warn('Not authenticated: skipping Firestore write');
    }
  } else {
    const data = brandSnap.data();
    const practiced = (data.practiced || 0) + 1;
    const correct = (data.correct || 0) + (isCorrect ? 1 : 0);
    const totalAccuracy = (data.totalAccuracy || 0) + accuracy;
    const avgAccuracy = totalAccuracy / practiced;
    const auth = getAuth();
    if (auth.currentUser) {
      await updateDoc(brandRef, {
        practiced,
        correct,
        totalAccuracy,
        avgAccuracy,
      });
    } else {
      console.warn('Not authenticated: skipping Firestore write');
    }
  }
  // Also update user's accuracyByBrand for admin dashboard graph
  if (userId && brand && typeof accuracy === 'number') {
    const userRef = doc(db, 'users', userId);
    const auth = getAuth();
    if (auth.currentUser) {
      await updateDoc(userRef, {
        [`accuracyByBrand.${brand}`]: accuracy
      });
    } else {
      console.warn('Not authenticated: skipping Firestore write');
    }
  }
}
