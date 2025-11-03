/**
 * Service for OpenAI API integration
 * Used for enhancing prompts and other AI-powered features
 */

export const enhancePromptWithOpenAI = async (
    basePrompt: string,
    dance: string
): Promise<string> => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    // If OpenAI API key is not configured, return the base prompt
    if (!apiKey) {
        return basePrompt;
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
                        content: 'You are a creative video prompt engineer. Enhance video generation prompts to be more descriptive and engaging while keeping them concise (under 100 words).'
                    },
                    {
                        role: 'user',
                        content: `Create an enhanced, detailed prompt for generating a video of a pet dancing the "${dance}". Make it vivid and descriptive, focusing on smooth, natural movements and an engaging, fun setting. Keep it under 100 words.`
                    }
                ],
                max_tokens: 150,
                temperature: 0.8,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            console.warn('OpenAI prompt enhancement failed, using base prompt:', errorData.message);
            return basePrompt;
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
    return basePrompt;
};

