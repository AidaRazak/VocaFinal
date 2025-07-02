import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzePronunciation } from '../server/pronunciationAnalyzer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { brandName } = req.body;
  if (!brandName) {
    res.status(400).json({ error: 'Missing brandName in request' });
    return;
  }
  try {
    const result = analyzePronunciation(brandName);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
} 