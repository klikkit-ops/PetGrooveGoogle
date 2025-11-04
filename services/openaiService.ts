/**
 * Service for OpenAI API integration
 * Used for creating detailed, dance-specific prompts optimized for veo3.1_fast video generation
 * CRITICAL: The prompt must ensure the pet looks IDENTICAL to the uploaded image while performing the dance
 */

export const enhancePromptWithOpenAI = async (
    dance: string
): Promise<string> => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    // If OpenAI API key is not configured, return a base prompt
    // CRITICAL: Must emphasize pet is identical to input image
    if (!apiKey) {
        return `The exact pet from the input image, looking identical with the same appearance, performs the ${dance} dance. The pet's body moves in ${dance} style movements while maintaining its original appearance.`;
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
                        content: `You are a prompt engineer for image-to-video generation using RunwayML veo3.1_fast model.

CRITICAL REQUIREMENT: The pet in the output video MUST look IDENTICAL to the pet in the input image. Same species, same colors, same markings, same size, same features. Only the pet's MOVEMENT should change based on the dance.

Your prompt must:
1. Explicitly state that the pet is identical to the input image
2. Describe the specific dance movements for "${dance}"
3. Explain how the pet's body parts (paws, tail, head, body) move in the "${dance}" style
4. Keep the description clear and focused (60-100 words)

Format:
"The exact pet from the input image, looking identical with the same appearance, performs [dance-specific movements]. The pet's [body parts] move in [dance style] patterns. [Specific dance movements]."`
                    },
                    {
                        role: 'user',
                        content: `Create a detailed prompt for an 8-second video where THE EXACT PET from the input image performs the "${dance}" dance.

REQUIREMENTS:
- The pet must be IDENTICAL to the input image (same appearance, no transformation)
- Describe the specific dance movements characteristic of "${dance}"
- Explain how the pet's body parts move in "${dance}" style
- Be specific about the movement patterns, rhythm, and energy

Example for "The Robot" dance:
"The exact pet from the input image, looking identical with the same appearance and features, performs the robot dance. The pet moves in stiff, mechanical, robotic motions. Its paws lift and lower in sharp, angular movements. The head turns in precise, jerky rotations. The body moves in synchronized, mechanical steps while maintaining the pet's original appearance throughout. The dance continues for 8 seconds with consistent robotic movements."

Now write a detailed prompt for "${dance}" following this format - emphasizing the pet's identical appearance and the specific dance movements.`
                    }
                ],
                max_tokens: 150,
                temperature: 0.8,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            console.warn('OpenAI prompt enhancement failed, using base prompt:', errorData.message);
            return `The exact pet from the input image, looking identical with the same appearance, performs the ${dance} dance. The pet's body moves in ${dance} style movements while maintaining its original appearance.`;
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
    // CRITICAL: Must emphasize pet is identical to input image
    return `The exact pet from the input image, looking identical with the same appearance, performs the ${dance} dance. The pet's body moves in ${dance} style movements while maintaining its original appearance.`;
};

