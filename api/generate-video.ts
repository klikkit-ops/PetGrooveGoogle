import { RunwayML, TaskFailedError } from '@runwayml/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, prompt, enhancedPrompt, dance } = req.body;

    if (!image || !dance) {
      return res.status(400).json({ error: 'Missing required fields: image and dance' });
    }

    // Get API key from environment (server-side, no VITE_ prefix)
    // The SDK looks for RUNWAYML_API_SECRET env var OR accepts apiKey option
    const apiKey = process.env.RUNWAY_API_KEY || process.env.RUNWAYML_API_KEY || process.env.RUNWAYML_API_SECRET;
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'RunwayML API key not configured. Please set RUNWAY_API_KEY in Vercel environment variables.',
        availableEnvVars: Object.keys(process.env).filter(k => k.includes('RUNWAY'))
      });
    }

    // Initialize RunwayML client
    // According to docs: https://docs.dev.runwayml.com/
    // SDK can be initialized with: new RunwayML() if RUNWAYML_API_SECRET env var is set
    // OR: new RunwayML({ apiKey: 'key' })
    // Set env var first, then initialize
    if (!process.env.RUNWAYML_API_SECRET) {
      process.env.RUNWAYML_API_SECRET = apiKey;
    }

    let client: RunwayML;
    try {
      // Try initializing with env var first (docs pattern)
      client = new RunwayML();
      console.log('RunwayML client initialized successfully');
    } catch (initError: any) {
      // Fallback: try with explicit apiKey
      try {
        console.log('Retrying with explicit apiKey...');
        client = new RunwayML({ apiKey: apiKey });
        console.log('RunwayML client initialized with explicit apiKey');
      } catch (fallbackError: any) {
        console.error('Failed to initialize RunwayML client:', fallbackError);
        return res.status(500).json({ 
          error: 'Failed to initialize RunwayML client',
          details: fallbackError?.message || fallbackError?.toString(),
          stack: fallbackError?.stack
        });
      }
    }

    // Use enhanced prompt if provided, otherwise create default
    const finalPrompt = enhancedPrompt || 
      `A 5-second video of this pet dancing '${dance}' in a fun, colorful setting. The pet should be animated and dancing gracefully with smooth movements.`;

    try {
      // Create image-to-video generation task using gen4_turbo model
      // According to RunwayML docs: https://docs.dev.runwayml.com/
      // - promptImage: accepts URL (examples show URLs, but SDK may accept data URLs)
      // - duration: must be 5 or 10 seconds (gen4_turbo limitation)
      // - ratio: valid formats are '1280:720', '720:1280', '1104:832', '832:1104', '960:960', '1584:672'
      // - model: 'gen4_turbo'
      
      // The SDK examples show URLs, but data URLs might work
      // If this fails with image format error, we'll need to upload to a temporary URL first
      const task = await client.imageToVideo
        .create({
          model: 'gen4_turbo',
          promptText: finalPrompt,
          promptImage: image, // Data URL - SDK may accept this, or may need actual URL
          ratio: '960:960', // Square format - valid for gen4_turbo
          duration: 5, // gen4_turbo supports only 5 or 10 seconds (using 5 for cost)
        })
        .waitForTaskOutput();

      if (!task.output || task.output.length === 0) {
        return res.status(500).json({ error: 'Video generation completed but no output URL provided' });
      }

      // Return the video URL
      return res.status(200).json({
        success: true,
        videoUrl: task.output[0],
      });
    } catch (error) {
      if (error instanceof TaskFailedError) {
        console.error('RunwayML task failed:', error.taskDetails);
        return res.status(500).json({
          error: 'Video generation failed',
          details: error.taskDetails,
        });
      }
      console.error('RunwayML API error:', error);
      throw error;
    }
  } catch (error: any) {
    console.error('Error in generate-video API:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
    });
    
    return res.status(500).json({
      error: error.message || 'Internal server error',
      details: error?.stack || error?.toString(),
      type: error?.name || typeof error,
    });
  }
}

