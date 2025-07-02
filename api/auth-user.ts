import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.status(501).json({ message: 'Auth not implemented. Replace with Firebase Auth.' });
} 