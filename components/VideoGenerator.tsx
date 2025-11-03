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
        // Check if RunwayML API key is configured
        const runwayKey = import.meta.env.VITE_RUNWAY_API_KEY;
        setApiKeySelected(!!runwayKey);
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
        // Check if API key is now available
        const runwayKey = import.meta.env.VITE_RUNWAY_API_KEY;
        if (runwayKey) {
            setApiKeySelected(true);
        } else {
            setError('RunwayML API key not found. Please set VITE_RUNWAY_API_KEY in your environment variables.');
        }
    };

    const handleGenerate = async () => {
        if (!imageFile || !apiKeySelected) return;
        if (credits <= 0) {
            setError('You have no credits left! Please buy more in the Account section.');
            return;
        }

        setIsLoading(true);
        setGeneratedVideoUrl('');
        setError('');
        useCredit();

        try {
            // Optionally enhance prompt with OpenAI
            let enhancedPrompt: string | undefined;
            try {
                enhancedPrompt = await enhancePromptWithOpenAI(
                    `An 8-second video of this pet dancing '${selectedDance}' in a fun, colorful setting.`,
                    selectedDance
                );
            } catch (promptError) {
                // If prompt enhancement fails, continue with base prompt
                console.warn('Prompt enhancement failed, using base prompt:', promptError);
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
             if (errorMessage.includes("401") || errorMessage.includes("Unauthorized") || errorMessage.includes("invalid")) {
                 errorMessage = "Your RunwayML API key is invalid. Please check your VITE_RUNWAY_API_KEY environment variable.";
                 setApiKeySelected(false); // Reset key state
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
                             <p className="text-sm mb-4">Please configure your RunwayML API key in environment variables to enable video generation.</p>
                             <a href="https://docs.runwayml.com/" target="_blank" rel="noopener noreferrer" className="text-sm text-brand-yellow hover:underline mb-4 block">Learn about RunwayML API</a>
                             <button
                                onClick={() => setApiKeySelected(true)}
                                className="w-full bg-brand-yellow text-brand-bg font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity"
                            >
                                I've Set Up My API Key
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleGenerate}
                            disabled={!imageFile || isLoading || credits <= 0}
                            className="w-full bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                        >
                            {isLoading ? 'Generating...' : `Generate Video (1 Credit)`}
                        </button>
                    )}
                </div>
                 {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
            </div>

            <div className="bg-brand-surface p-6 rounded-xl shadow-lg flex flex-col items-center justify-center min-h-[400px]">
                <h2 className="text-2xl font-bold mb-4 text-brand-yellow self-start">3. Watch The Magic!</h2>
                <div className="w-full h-full flex items-center justify-center aspect-square bg-black rounded-lg">
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