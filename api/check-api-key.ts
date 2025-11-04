import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Simple endpoint to check if RunwayML API key is configured
 * This allows the frontend to verify API key availability without making actual API calls
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check for API key in environment variables
    const apiKey = process.env.RUNWAY_API_KEY || process.env.RUNWAYML_API_KEY || process.env.RUNWAYML_API_SECRET;
    
    if (!apiKey) {
      return res.status(200).json({
        configured: false,
        message: 'RunwayML API key not configured. Please set RUNWAY_API_KEY in Vercel environment variables.',
        availableEnvVars: Object.keys(process.env).filter(k => k.includes('RUNWAY'))
      });
    }

    // Basic validation: check if key looks valid (starts with common prefixes)
    const keyPrefixes = ['rw_', 'rw-', 'runway_'];
    const looksValid = keyPrefixes.some(prefix => apiKey.startsWith(prefix)) || apiKey.length > 10;

    return res.status(200).json({
      configured: true,
      looksValid: looksValid,
      message: 'RunwayML API key is configured.',
      keyLength: apiKey.length,
      // Don't expose the actual key, just confirm it exists
      keyPrefix: apiKey.substring(0, 3) + '...'
    });
  } catch (error: any) {
    console.error('Error checking API key:', error);
    return res.status(500).json({
      configured: false,
      error: 'Error checking API key configuration',
      details: error?.message || 'Unknown error'
    });
  }
}

