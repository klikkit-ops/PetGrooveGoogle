import { fileToBase64 } from "./utils";

/**
 * Generate a dancing pet video using RunwayML via our serverless API
 * This avoids CORS issues by calling our Vercel API route instead of RunwayML directly
 */
export const generateDancingPetVideo = async (
    imageFile: File,
    dance: string,
    enhancedPrompt?: string
): Promise<string> => {
    const base64Image = await fileToBase64(imageFile);
    const imageDataUrl = `data:${imageFile.type};base64,${base64Image}`;
    
    // Call our Vercel serverless function instead of RunwayML directly
    // This avoids CORS issues and keeps the API key secure on the server
    const apiResponse = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            image: imageDataUrl,
            dance: dance,
            enhancedPrompt: enhancedPrompt,
        }),
    });

    if (!apiResponse.ok) {
        let errorMessage = `HTTP ${apiResponse.status}: ${apiResponse.statusText}`;
        try {
            const errorData = await apiResponse.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
            if (errorData.details) {
                errorMessage += ` - ${JSON.stringify(errorData.details)}`;
            }
        } catch {
            // If JSON parsing fails, use the status text
        }
        throw new Error(`Failed to generate video: ${errorMessage}`);
    }

    const result = await apiResponse.json();
    
    if (!result.success || !result.videoUrl) {
        throw new Error('Video generation completed but no video URL was returned.');
    }

    // Return the original RunwayML video URL (persistent)
    // This URL will be saved to the database and can be accessed later
    // If there are CORS issues when displaying, we can proxy it through our API
    return result.videoUrl;
};

