import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Proxy endpoint to serve RunwayML videos
 * This helps avoid CORS issues when displaying videos from RunwayML URLs
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
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid url parameter' });
    }

    // Validate that the URL is from RunwayML (security check)
    if (!url.includes('runway') && !url.includes('runwayml')) {
      return res.status(400).json({ error: 'Invalid video URL' });
    }

    // Fetch the video from RunwayML
    const videoResponse = await fetch(url);

    if (!videoResponse.ok) {
      return res.status(videoResponse.status).json({ 
        error: 'Failed to fetch video from RunwayML',
        status: videoResponse.status 
      });
    }

    // Get the video content type
    const contentType = videoResponse.headers.get('content-type') || 'video/mp4';

    // Set appropriate headers for video streaming
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS

    // Stream the video to the client
    const videoBuffer = await videoResponse.arrayBuffer();
    res.send(Buffer.from(videoBuffer));

  } catch (error: any) {
    console.error('Error proxying video:', error);
    return res.status(500).json({
      error: 'Failed to proxy video',
      details: error?.message || 'Unknown error'
    });
  }
}

