/**
 * Service for OpenAI API integration
 * Used for creating detailed, dance-specific prompts optimized for gen4_turbo video generation
 */

export const enhancePromptWithOpenAI = async (
    dance: string
): Promise<string> => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    // If OpenAI API key is not configured, return a base prompt
    if (!apiKey) {
        return `A 5-second video of this pet performing the '${dance}' dance. The pet maintains its original appearance and natural anatomy. The pet uses its actual body parts (paws, tail, ears, etc.) to perform the specific movements characteristic of '${dance}'. The setting is fun and colorful, with smooth, natural movements showing the pet dancing.`;
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Use cost-effective model
                messages: [
                    {
                        role: 'system',
                        content: `You are a professional video prompt engineer specializing in AI video generation (gen4_turbo model). 
Create detailed, specific prompts that will generate high-quality videos. CRITICAL RULES:
- The pet MUST maintain its original appearance (species, color, size, features) throughout the video
- The pet should PERFORM the dance movements, not transform or merge with dance elements
- Describe the pet's actual body parts (paws, tail, ears, etc.) performing the dance movements
- Focus on how the pet's natural anatomy executes the "${dance}" dance style
- Visual details: lighting, colors, setting, atmosphere
- Camera movement and framing
- Pet's body language and expression while maintaining its original appearance
- Smooth, natural motion that shows the pet dancing, not transforming
Keep prompts under 150 words and optimized for portrait format (720:1280).`
                    },
                    {
                        role: 'user',
                        content: `Create a detailed, vivid prompt for generating a 5-second video of a pet performing the "${dance}" dance. 

IMPORTANT: The pet must maintain its original appearance and natural anatomy. The pet should perform the "${dance}" dance movements using its actual body (paws, tail, ears, etc.), not transform into a hybrid creature. 

Describe:
- How the pet's natural body parts execute the specific "${dance}" dance movements
- The pet's energy and expression while performing the dance (maintaining its original appearance)
- The setting, lighting, and atmosphere
- The specific dance movements characteristic of "${dance}" that the pet will perform

Example for "robot dance": The pet should move its body in stiff, mechanical, robotic movements using its actual paws, tail, and head - not become part-robot.

Make it highly descriptive so the AI video generator creates a stunning video of the pet performing the dance, not transforming into something else.`
                    }
                ],
                max_tokens: 200,
                temperature: 0.9,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            console.warn('OpenAI prompt enhancement failed, using base prompt:', errorData.message);
            return `A 5-second video of this pet performing the '${dance}' dance. The pet maintains its original appearance and natural anatomy. The pet uses its actual body parts (paws, tail, ears, etc.) to perform the specific movements characteristic of '${dance}'. The setting is fun and colorful, with smooth, natural movements showing the pet dancing.`;
        }

        const data = await response.json();
        const enhancedPrompt = data.choices?.[0]?.message?.content?.trim();
        
        if (enhancedPrompt) {
            return enhancedPrompt;
        }
    } catch (error) {
        console.warn('OpenAI prompt enhancement error, using base prompt:', error);
    }

    // Fallback to base prompt if anything goes wrong
    return `A 5-second video of this pet performing the '${dance}' dance. The pet maintains its original appearance and natural anatomy. The pet uses its actual body parts (paws, tail, ears, etc.) to perform the specific movements characteristic of '${dance}'. The setting is fun and colorful, with smooth, natural movements showing the pet dancing.`;
};

