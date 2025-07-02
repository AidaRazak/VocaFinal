import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzePronunciation } from '../server/pronunciationAnalyzer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { transcript, targetBrand } = req.body;
  if (!transcript) {
    res.status(400).json({ error: 'Missing transcript in request' });
    return;
  }
  try {
    const result = analyzePronunciation(transcript);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
} 