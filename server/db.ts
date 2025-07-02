import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

// Initialize Firebase Admin only once
const firebaseAdminConfig: any = {
  credential: process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? cert(JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')))
    : applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || 'aipronunciationcorrector', // fallback to your projectId
};

const app = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0];

export const db = getFirestore(app);