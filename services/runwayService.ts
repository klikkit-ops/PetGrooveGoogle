import { fileToBase64 } from "./utils";

interface RunwayVideoGenerationResponse {
  id: string;
  status: string;
  output?: string[];
  error?: string;
}

export const generateDancingPetVideo = async (
    imageFile: File,
    dance: string,
    enhancedPrompt?: string
): Promise<string> => {
    const apiKey = import.meta.env.VITE_RUNWAY_API_KEY;
    if (!apiKey) {
        throw new Error('RUNWAY_API_KEY is not configured. Please set VITE_RUNWAY_API_KEY in your environment variables.');
    }

    const base64Image = await fileToBase64(imageFile);
    
    // Use enhanced prompt if provided, otherwise use default
    const prompt = enhancedPrompt || `An 8-second video of this pet dancing '${dance}' in a fun, colorful setting. The pet should be animated and dancing gracefully with smooth movements.`;

    // Step 1: Create a video generation task
    // NOTE: RunwayML API endpoints and request format may vary.
    // Please verify the correct API endpoints in RunwayML documentation:
    // https://docs.runwayml.com/
    const requestBody = {
        image: `data:${imageFile.type};base64,${base64Image}`,
        prompt: prompt,
        duration: 8, // 8 seconds
        aspect_ratio: '1:1', // Square format
        resolution: '1280x1280',
    };
    
    console.log('RunwayML API Request:', {
        endpoint: 'https://api.runwayml.com/v1/image-to-video',
        body: { ...requestBody, image: '[base64 data...]' }
    });
    
    const createResponse = await fetch('https://api.runwayml.com/v1/image-to-video', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!createResponse.ok) {
        let errorMessage = `HTTP ${createResponse.status}: ${createResponse.statusText}`;
        try {
            const errorData = await createResponse.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
            if (errorData.details) {
                errorMessage += ` - ${JSON.stringify(errorData.details)}`;
            }
        } catch {
            // If JSON parsing fails, use the status text
        }
        throw new Error(`Failed to create video generation task: ${errorMessage}`);
    }

    const taskData: RunwayVideoGenerationResponse = await createResponse.json();
    
    if (taskData.error) {
        throw new Error(`Video generation error: ${taskData.error}`);
    }

    const taskId = taskData.id;
    if (!taskId) {
        throw new Error('No task ID returned from RunwayML API');
    }

    // Step 2: Poll for completion
    let status = taskData.status;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max (5 second intervals)
    
    while (status !== 'completed' && status !== 'failed' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const statusResponse = await fetch(`https://api.runwayml.com/v1/image-to-video/${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });

        if (!statusResponse.ok) {
            throw new Error(`Failed to check video generation status: ${statusResponse.statusText}`);
        }

        const statusData: RunwayVideoGenerationResponse = await statusResponse.json();
        status = statusData.status;
        
        if (statusData.error) {
            throw new Error(`Video generation error: ${statusData.error}`);
        }
        
        attempts++;
    }

    if (status !== 'completed') {
        throw new Error(`Video generation timed out or failed. Status: ${status}`);
    }

    // Step 3: Get the final result
    const finalResponse = await fetch(`https://api.runwayml.com/v1/image-to-video/${taskId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
    });

    if (!finalResponse.ok) {
        throw new Error(`Failed to get video result: ${finalResponse.statusText}`);
    }

    const finalData: RunwayVideoGenerationResponse = await finalResponse.json();
    
    if (!finalData.output || finalData.output.length === 0) {
        throw new Error('Video generation completed but no output URL was provided.');
    }

    const videoUrl = finalData.output[0];
    
    // Step 4: Download the video and convert to blob URL
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video from RunwayML (${videoResponse.status}): ${videoResponse.statusText}. Please check the video URL and CORS settings.`);
    }
    
    const blob = await videoResponse.blob();
    return URL.createObjectURL(blob);
};

