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
    const createResponse = await fetch('https://api.runwayml.com/v1/image-to-video', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            image: `data:${imageFile.type};base64,${base64Image}`,
            prompt: prompt,
            duration: 8, // 8 seconds
            aspect_ratio: '1:1', // Square format
            resolution: '1280x1280',
        }),
    });

    if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({ message: createResponse.statusText }));
        throw new Error(`Failed to create video generation task: ${errorData.message || createResponse.statusText}`);
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
        throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
    }
    
    const blob = await videoResponse.blob();
    return URL.createObjectURL(blob);
};

