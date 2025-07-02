import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { jobName } = req.body;
  if (!jobName) {
    res.status(400).json({ error: 'Missing jobName' });
    return;
  }
  const lambdaUrl = process.env.LAMBDA_URL || 'https://n3yf6j9xdj.execute-api.ap-southeast-1.amazonaws.com/default/processPronunciationAudio';
  try {
    const response = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'poll',
        jobName,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: 'Polling error', details: errorText });
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
} 