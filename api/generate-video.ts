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

    // Set environment variable for SDK (it checks this first)
    // Then also pass it explicitly to be safe
    if (!process.env.RUNWAYML_API_SECRET) {
      process.env.RUNWAYML_API_SECRET = apiKey;
    }

    // Initialize RunwayML client
    // The SDK accepts apiKey option in constructor
    let client: RunwayML;
    try {
      client = new RunwayML({ 
        apiKey: apiKey,
      });
      console.log('RunwayML client initialized successfully');
    } catch (initError: any) {
      console.error('Failed to initialize RunwayML client:', initError);
      return res.status(500).json({ 
        error: 'Failed to initialize RunwayML client',
        details: initError?.message || initError?.toString(),
        stack: initError?.stack
      });
    }

    // Use enhanced prompt if provided, otherwise create default
    const finalPrompt = enhancedPrompt || 
      `An 8-second video of this pet dancing '${dance}' in a fun, colorful setting. The pet should be animated and dancing gracefully with smooth movements.`;

    try {
      // Create image-to-video generation task using gen4_turbo model
      const task = await client.imageToVideo
        .create({
          model: 'gen4_turbo',
          promptText: finalPrompt,
          promptImage: image, // Base64 image string
          ratio: '1:1',
          duration: 8,
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

