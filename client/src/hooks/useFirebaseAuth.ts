import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, getAuth } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Create or update user document in Firestore
        await createUserDocument(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const createUserDocument = async (user: User) => {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      const { displayName, email, photoURL } = user;
      const auth = getAuth();
      if (auth.currentUser) {
        try {
          await setDoc(userRef, {
            displayName,
            email,
            photoURL,
            username: displayName || email?.split('@')[0] || 'User',
            gameScore: 0,
            streakCount: 0,
            totalWordsPracticed: 0,
            averageAccuracy: 0,
            currentStreak: 0,
            longestStreak: 0,
            lastPracticeDate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } catch (error) {
          console.error('Error creating user document:', error);
        }
      } else {
        console.warn('Not authenticated: skipping Firestore write');
      }
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, username: string) => {
    try {
      console.log('Attempting to create user with email:', email);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('User created successfully:', result.user);
      
      await updateProfile(result.user, { displayName: username });
      console.log('Profile updated with username:', username);
      
      // Create user document in Firestore
      await createUserDocument(result.user);
      console.log('User document created in Firestore');
      
      return result.user;
    } catch (error: any) {
      console.error('Error signing up with email:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign in with email:', email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Sign in successful:', result.user);
      return result.user;
    } catch (error: any) {
      console.error('Error signing in with email:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return {
    user,
    loading,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    logout,
    isAuthenticated: !!user,
  };
}