import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
import { AppContext } from '../contexts/AppContext';
import { DANCES, VIDEO_GENERATION_MESSAGES } from '../constants';
import { generateDancingPetVideo } from '../services/runwayService';
import { enhancePromptWithOpenAI } from '../services/openaiService';
import Spinner from './Spinner';
import { UploadIcon } from './Icons';

// Removed AIStudio interface - no longer needed with RunwayML

const VideoGenerator: React.FC = () => {
    const context = useContext(AppContext);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [selectedDance, setSelectedDance] = useState<string>(DANCES[0]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [apiKeySelected, setApiKeySelected] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState(VIDEO_GENERATION_MESSAGES[0]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const checkApiKey = useCallback(async () => {
        // Check if API key is configured server-side
        try {
            const response = await fetch('/api/check-api-key');
            if (!response.ok) {
                console.warn('Failed to check API key status');
                setApiKeySelected(false);
                return;
            }
            
            const data = await response.json();
            if (data.configured) {
                setApiKeySelected(true);
                setError(''); // Clear any previous errors
            } else {
                setApiKeySelected(false);
                if (data.message) {
                    setError(data.message);
                }
            }
        } catch (err) {
            console.error('Error checking API key:', err);
            // If we can't check, assume it's not configured to be safe
            setApiKeySelected(false);
            setError('Unable to verify API key configuration. Please ensure RUNWAY_API_KEY is set in Vercel environment variables.');
        }
    }, []);

    useEffect(() => {
        checkApiKey();
    }, [checkApiKey]);

    useEffect(() => {
        // FIX: Use ReturnType<typeof setInterval> for browser compatibility instead of NodeJS.Timeout.
        let interval: ReturnType<typeof setInterval>;
        if (isLoading) {
            interval = setInterval(() => {
                setLoadingMessage(prev => {
                    const currentIndex = VIDEO_GENERATION_MESSAGES.indexOf(prev);
                    const nextIndex = (currentIndex + 1) % VIDEO_GENERATION_MESSAGES.length;
                    return VIDEO_GENERATION_MESSAGES[nextIndex];
                });
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [isLoading]);

    if (!context) return null;
    const { credits, useCredit, addVideo } = context;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setGeneratedVideoUrl('');
            setError('');
        }
    };
    
    const handleSelectApiKey = async () => {
        // Re-check API key when user clicks "I've Set Up My API Key"
        await checkApiKey();
    };

    const handleGenerate = async () => {
        if (!imageFile || !apiKeySelected) return;
        if (credits < 500) {
            setError(`You need 500 credits to generate a video. You currently have ${credits} credits. Please subscribe or purchase credits in the Account section.`);
            return;
        }

        setIsLoading(true);
        setGeneratedVideoUrl('');
        setError('');
        useCredit();

        try {
            // Enhance prompt with OpenAI - creates detailed dance-specific prompt
            let enhancedPrompt: string;
            try {
                enhancedPrompt = await enhancePromptWithOpenAI(selectedDance);
            } catch (promptError) {
                // If prompt enhancement fails, use base prompt
                console.warn('Prompt enhancement failed, using base prompt:', promptError);
                enhancedPrompt = `The pet moves in ${selectedDance} style movements.`;
            }
            
            const videoUrl = await generateDancingPetVideo(imageFile, selectedDance, enhancedPrompt);
            setGeneratedVideoUrl(videoUrl);
            addVideo({
                id: new Date().toISOString(),
                dance: selectedDance,
                videoUrl: videoUrl,
                thumbnailUrl: imagePreview,
                timestamp: new Date()
            });
        } catch (err: any) {
            let errorMessage = 'An unknown error occurred.';
            if (err instanceof Error) {
                errorMessage = err.message;
            }
            
            // Check for API key related errors
            const errorLower = errorMessage.toLowerCase();
            if (errorLower.includes("401") || 
                errorLower.includes("unauthorized") || 
                errorLower.includes("invalid") || 
                errorLower.includes("api key not configured") ||
                errorLower.includes("authentication") ||
                errorLower.includes("forbidden") ||
                errorLower.includes("403")) {
                errorMessage = "Your RunwayML API key is invalid or not configured. Please check your RUNWAY_API_KEY environment variable in Vercel (server-side, no VITE_ prefix). Make sure to redeploy after adding the environment variable.";
                setApiKeySelected(false); // Reset key state
                // Re-check API key status
                await checkApiKey();
            } else if (errorLower.includes("failed to generate video")) {
                // Extract more specific error details if available
                const match = errorMessage.match(/Failed to generate video: (.+)/);
                if (match) {
                    errorMessage = match[1];
                }
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-in-up">
            <div className="bg-brand-surface p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-brand-yellow">1. Upload Your Pet's Photo</h2>
                <div 
                    className="border-2 border-dashed border-brand-muted rounded-lg p-6 text-center cursor-pointer hover:border-brand-purple transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    {imagePreview ? (
                        <img src={imagePreview} alt="Pet preview" className="max-h-64 w-auto mx-auto rounded-lg object-contain" />
                    ) : (
                        <div className="flex flex-col items-center text-gray-400">
                           <UploadIcon className="w-12 h-12 mb-2" />
                           <span>Click to upload an image</span>
                           <span className="text-sm">PNG, JPG, WEBP</span>
                        </div>
                    )}
                </div>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-brand-yellow">2. Choose a Dance</h2>
                <select
                    value={selectedDance}
                    onChange={(e) => setSelectedDance(e.target.value)}
                    className="w-full bg-brand-muted p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-brand-purple focus:outline-none"
                >
                    {DANCES.map(dance => (
                        <option key={dance} value={dance}>{dance}</option>
                    ))}
                </select>

                <div className="mt-8">
                    {!apiKeySelected ? (
                        <div className="text-center p-4 bg-yellow-900/50 border border-yellow-500 rounded-lg">
                             <p className="mb-3 font-semibold">API Key Required</p>
                             <p className="text-sm mb-2">Please configure your RunwayML API key in Vercel environment variables to enable video generation.</p>
                             <div className="text-xs text-yellow-300 mb-4 bg-yellow-900/30 p-3 rounded">
                                <p className="font-semibold mb-1">Steps to configure:</p>
                                <ol className="list-decimal list-inside text-left space-y-1">
                                    <li>Go to your Vercel project → Settings → Environment Variables</li>
                                    <li>Add: <code className="bg-black/50 px-1 rounded">RUNWAY_API_KEY</code> (no VITE_ prefix)</li>
                                    <li>Redeploy your project after adding the variable</li>
                                </ol>
                             </div>
                             <a href="https://docs.dev.runwayml.com/" target="_blank" rel="noopener noreferrer" className="text-sm text-brand-yellow hover:underline mb-4 block">Learn about RunwayML API</a>
                             <button
                                onClick={handleSelectApiKey}
                                className="w-full bg-brand-yellow text-brand-bg font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity"
                            >
                                I've Set Up My API Key - Check Again
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleGenerate}
                            disabled={!imageFile || isLoading || credits < 500}
                            className="w-full bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                        >
                            {isLoading ? 'Generating...' : `Generate Video (500 Credits)`}
                        </button>
                    )}
                </div>
                 {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
            </div>

            <div className="bg-brand-surface p-6 rounded-xl shadow-lg flex flex-col items-center justify-center min-h-[400px]">
                <h2 className="text-2xl font-bold mb-4 text-brand-yellow self-start">3. Watch The Magic!</h2>
                <div className="w-full h-full flex items-center justify-center aspect-[9/16] bg-black rounded-lg">
                    {isLoading ? (
                         <div className="text-center">
                            <Spinner />
                            <p className="mt-4 text-lg text-gray-300">{loadingMessage}</p>
                         </div>
                    ) : generatedVideoUrl ? (
                        <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full rounded-lg" />
                    ) : (
                         <div className="text-center text-brand-muted">
                            <span className="text-5xl">🎬</span>
                            <p className="mt-2">Your generated video will appear here</p>
                         </div>
                    )}
                </div>
                 {generatedVideoUrl && !isLoading && (
                    <a
                        href={generatedVideoUrl}
                        download={`pet-dance-${selectedDance.replace(/\s+/g, '-')}.mp4`}
                        className="mt-4 w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors text-center"
                    >
                        Download Video
                    </a>
                 )}
            </div>
        </div>
    );
};

export default VideoGenerator;