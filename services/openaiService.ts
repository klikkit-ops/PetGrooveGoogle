/**
 * Service for OpenAI API integration
 * Used for creating detailed, dance-specific prompts optimized for veo3.1_fast video generation
 * CRITICAL: The prompt must ensure the pet looks IDENTICAL to the uploaded image while performing the dance
 */

export const enhancePromptWithOpenAI = async (
    dance: string
): Promise<string> => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    // If OpenAI API key is not configured, return a simple movement-only prompt
    // For image-to-video: image provides appearance, prompt only describes movement
    if (!apiKey) {
        return `The pet moves in ${dance} style movements.`;
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
                        content: `You are a prompt engineer for RunwayML veo3.1_fast image-to-video generation.

CRITICAL RULES (based on RunwayML best practices):
1. The input IMAGE provides ALL appearance details (species, colors, markings, size, features)
2. Your prompt should ONLY describe MOVEMENT - never describe appearance
3. Keep prompts SHORT (20-40 words maximum) - shorter prompts work better for image-to-video
4. Focus purely on HOW the pet moves, not WHAT it looks like
5. Use simple, direct language about motion patterns

DO NOT:
- Describe the pet's appearance (image handles this)
- Mention colors, markings, or species
- Use phrases like "identical" or "same appearance" (redundant with image-to-video)
- Make prompts longer than 40 words

DO:
- Describe movement patterns (stiff, fluid, rhythmic, etc.)
- Specify which body parts move (paws, tail, head)
- Describe motion rhythm and energy
- Keep it concise and motion-focused`
                    },
                    {
                        role: 'user',
                        content: `Write a SHORT (20-40 words) prompt describing ONLY the movement for "${dance}" dance.

The prompt should describe:
- How the pet's body moves (stiff, fluid, bouncy, etc.)
- Which parts move (paws, tail, head, body)
- The rhythm/pattern of movement

Example for "The Robot":
"Stiff, mechanical movements. Paws lift and lower in sharp angles. Head turns in jerky rotations. Body moves in synchronized robotic steps."

Now write a similar SHORT movement-only prompt for "${dance}".`
                    }
                ],
                max_tokens: 80, // Reduced for shorter prompts
                temperature: 0.6, // Lower temperature for more consistent, focused prompts
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            console.warn('OpenAI prompt enhancement failed, using base prompt:', errorData.message);
            return `The pet moves in ${dance} style movements.`;
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
    // Simple movement-only prompt for image-to-video
    return `The pet moves in ${dance} style movements.`;
};

