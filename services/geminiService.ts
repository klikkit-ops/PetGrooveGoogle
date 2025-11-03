
import { GoogleGenAI } from "@google/genai";
import { fileToBase64 } from "./utils";

export const generateDancingPetVideo = async (
    imageFile: File,
    dance: string
): Promise<string> => {
    
    // API Key selection is handled by the component calling this service.
    // A new instance is created here to ensure the latest key is used.
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured. Please set VITE_GEMINI_API_KEY in your environment variables.');
    }
    const ai = new GoogleGenAI({ apiKey });

    const base64Image = await fileToBase64(imageFile);

    const prompt = `An 8-second video of this pet dancing '${dance}' in a fun, colorful setting.`;

    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        image: {
            imageBytes: base64Image,
            mimeType: imageFile.type,
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '1:1'
        }
    });

    // Poll for completion
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
        throw new Error("Video generation failed or returned no URI.");
    }

    // The URI needs the API key to be accessed
    const videoUrlWithKey = `${downloadLink}&key=${apiKey}`;

    const response = await fetch(videoUrlWithKey);
    if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.statusText}`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
};
