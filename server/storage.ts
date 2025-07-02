import {
  users,
  userProgress,
  practiceSessions,
  type User,
  type UpsertUser,
  type UserProgress,
  type InsertUserProgress,
  type PracticeSession,
  type InsertPracticeSession,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User progress operations
  getUserProgress(userId: string): Promise<UserProgress | undefined>;
  upsertUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  
  // Practice session operations
  createPracticeSession(session: InsertPracticeSession): Promise<PracticeSession>;
  getUserPracticeSessions(userId: string, limit?: number): Promise<PracticeSession[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const doc = await db.collection('users').doc(id).get();
    return doc.exists ? (doc.data() as User) : undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const ref = db.collection('users').doc(userData.id);
    await ref.set({ ...userData, updatedAt: new Date() }, { merge: true });
    const doc = await ref.get();
    return doc.data() as User;
  }

  // User progress operations
  async getUserProgress(userId: string): Promise<UserProgress | undefined> {
    const doc = await db.collection('userProgress').doc(userId).get();
    return doc.exists ? (doc.data() as UserProgress) : undefined;
  }

  async upsertUserProgress(progressData: InsertUserProgress): Promise<UserProgress> {
    const ref = db.collection('userProgress').doc(progressData.userId);
    await ref.set({ ...progressData, updatedAt: new Date() }, { merge: true });
    const doc = await ref.get();
    return doc.data() as UserProgress;
  }

  // Practice session operations
  async createPracticeSession(sessionData: InsertPracticeSession): Promise<PracticeSession> {
    const ref = db.collection('practiceSessions').doc();
    await ref.set({ ...sessionData, createdAt: new Date() });
    const doc = await ref.get();
    return { id: ref.id, ...doc.data() } as PracticeSession;
  }

  async getUserPracticeSessions(userId: string, limit = 10): Promise<PracticeSession[]> {
    const snapshot = await db.collection('practiceSessions')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PracticeSession));
  }
}

export const storage = new DatabaseStorage();
