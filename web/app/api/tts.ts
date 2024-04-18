import type { NextApiRequest, NextApiResponse } from 'next';
import Cors from 'cors';

// Initializing the cors middleware with specific options
const cors = Cors({
  methods: ['POST'], // Allow only POST method for this endpoint
  origin: 'https://api.elevenlabs.io', // Specific origin or true for all origins
});

// Helper method to run middleware
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Run the CORS middleware
  await runMiddleware(req, res, cors);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text, voice_id } = req.body;

  const options: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVEN_LABS_API_KEY!,
    },
    body: JSON.stringify({
      text: text,
      model_id: process.env.NEXT_PUBLIC_ELEVEN_LABS_MODEL_ID!,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.0,
        use_speaker_boost: true
      },
    })
  };

  try {
    const apiResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}/stream`, options);
    if (!apiResponse.ok) throw new Error('Failed to convert text to speech');

    const audioBlob = await apiResponse.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    res.status(200).json({ audioUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
