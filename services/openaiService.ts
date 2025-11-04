/**
 * Service for OpenAI API integration
 * Used for creating detailed, dance-specific prompts optimized for gen4_turbo video generation
 */

export const enhancePromptWithOpenAI = async (
    dance: string
): Promise<string> => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    // If OpenAI API key is not configured, return a base prompt
    // For image-to-video, we only describe movement - the image provides the appearance
    if (!apiKey) {
        return `The pet moves its body in ${dance} style movements.`;
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
                        content: `You are a prompt engineer for image-to-video generation. The input image already contains the pet's appearance. Your job is ONLY to describe the MOVEMENT, not the pet's appearance.

Rules:
- Describe ONLY how the pet moves its body parts in the "${dance}" style
- Do NOT describe the pet's appearance (the image handles that)
- Do NOT mention colors, markings, species - these come from the input image
- Focus purely on motion: which body parts move, how they move, the rhythm/pattern
- Keep it under 50 words
- Simple, clear language`
                    },
                    {
                        role: 'user',
                        content: `Write a very short prompt (under 50 words) describing ONLY the movement for the "${dance}" dance.

Describe: How the pet's body parts (paws, tail, head) move in "${dance}" style. The rhythm and pattern of movement. The energy level.

Do NOT describe: The pet's appearance, colors, or species (the input image provides this).

Example for "robot dance": "The pet moves in stiff, mechanical movements. Paws lift and lower rhythmically. Head turns in sharp angles. Body moves in robotic, jerky motions."

Now write a similar prompt for "${dance}" - ONLY movement description.`
                    }
                ],
                max_tokens: 100,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            console.warn('OpenAI prompt enhancement failed, using base prompt:', errorData.message);
            return `The pet moves its body in ${dance} style movements.`;
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
    // For image-to-video, we only describe movement - the image provides the appearance
    return `The pet moves its body in ${dance} style movements.`;
};

