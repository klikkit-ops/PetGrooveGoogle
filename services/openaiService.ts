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
        return `A 5-second video of this pet dancing '${dance}' in a fun, colorful setting. The pet should be animated and dancing gracefully with smooth movements.`;
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
Create detailed, specific prompts that will generate high-quality videos. Focus on:
- Specific dance movements and characteristics unique to "${dance}"
- Visual details: lighting, colors, setting, atmosphere
- Camera movement and framing
- Pet's body language and expression
- Smooth, natural motion
Keep prompts under 150 words and optimized for portrait format (720:1280).`
                    },
                    {
                        role: 'user',
                        content: `Create a detailed, vivid prompt for generating a 5-second video of a pet performing "${dance}". 
Describe the specific dance movements, the pet's energy and expression, the setting, lighting, and atmosphere. 
Make it highly descriptive so the AI video generator can create a stunning, engaging video. 
Focus on what makes "${dance}" unique and visually interesting.`
                    }
                ],
                max_tokens: 200,
                temperature: 0.9,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            console.warn('OpenAI prompt enhancement failed, using base prompt:', errorData.message);
            return `A 5-second video of this pet dancing '${dance}' in a fun, colorful setting. The pet should be animated and dancing gracefully with smooth movements.`;
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
    return `A 5-second video of this pet dancing '${dance}' in a fun, colorful setting. The pet should be animated and dancing gracefully with smooth movements.`;
};

