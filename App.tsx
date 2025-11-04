
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { User, GeneratedVideo, AppContextType, View } from './types';
import { AppContext } from './contexts/AppContext';
import Header from './components/Header';
import Login from './components/Login';
import VideoGenerator from './components/VideoGenerator';
import MyVideos from './components/MyVideos';
import Account from './components/Account';
import { getCurrentUser, signOut as supabaseSignOut } from './services/authService';
import { getUserVideos, getUserCredits, saveVideo, addUserCredits, useUserCredit } from './services/databaseService';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [credits, setCredits] = useState<number>(0);
    const [videos, setVideos] = useState<GeneratedVideo[]>([]);
    const [currentView, setCurrentView] = useState<View>('generate');
    const [loading, setLoading] = useState<boolean>(true);

    // Load user session on mount
    useEffect(() => {
        const loadUserSession = async () => {
            setLoading(true);
            const { user: currentUser, error } = await getCurrentUser();
            
            if (currentUser && !error) {
                setUser(currentUser);
                // Load user data
                await loadUserData(currentUser.id);
            }
            
            setLoading(false);
        };

        loadUserSession();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Load user data (videos and credits)
    const loadUserData = useCallback(async (userId: string) => {
        const [videosResult, creditsResult] = await Promise.all([
            getUserVideos(userId),
            getUserCredits(userId),
        ]);

        if (videosResult.videos) {
            setVideos(videosResult.videos);
        }

        if (creditsResult.credits !== undefined) {
            setCredits(creditsResult.credits);
        }
    }, []);

    const handleLogin = useCallback((loggedInUser: User) => {
        setUser(loggedInUser);
        loadUserData(loggedInUser.id);
    }, [loadUserData]);

    const handleLogout = useCallback(async () => {
        await supabaseSignOut();
        setUser(null);
        setCredits(0);
        setVideos([]);
        setCurrentView('generate');
    }, []);

    const addCredits = useCallback(async (amount: number) => {
        if (!user) return;
        
        const { error } = await addUserCredits(user.id, amount, 'purchase');
        if (!error) {
            // Reload credits to get the updated total
            const { credits: updatedCredits } = await getUserCredits(user.id);
            setCredits(updatedCredits);
        }
    }, [user]);

    const useCredit = useCallback(async () => {
        if (!user) return;
        
        const { error } = await useUserCredit(user.id);
        if (!error) {
            // Reload credits to get the updated total
            const { credits: updatedCredits } = await getUserCredits(user.id);
            setCredits(updatedCredits);
        }
    }, [user]);

    const addVideo = useCallback(async (video: GeneratedVideo) => {
        if (!user) return;
        
        // Add to local state immediately for better UX
        setVideos(prev => [video, ...prev]);
        
        // Save to database
        const { error } = await saveVideo(user.id, video);
        if (error) {
            console.error('Failed to save video:', error);
            // Optionally remove from local state if save failed
        }
    }, [user]);

    const contextValue = useMemo<AppContextType>(() => ({
        user,
        credits,
        videos,
        login: handleLogin,
        logout: handleLogout,
        addCredits,
        useCredit,
        addVideo,
    }), [user, credits, videos, handleLogin, handleLogout, addCredits, useCredit, addVideo]);

    const renderView = () => {
        switch (currentView) {
            case 'generate':
                return <VideoGenerator />;
            case 'my-videos':
                return <MyVideos />;
            case 'account':
                return <Account />;
            default:
                return <VideoGenerator />;
        }
    };
    
    if (loading) {
        return (
            <div className="min-h-screen bg-brand-bg font-sans flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4 animate-pulse-slow">🐾</div>
                    <p className="text-gray-300">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <AppContext.Provider value={contextValue}>
            <div className="min-h-screen bg-brand-bg font-sans">
                {!user ? (
                    <Login onLogin={handleLogin} />
                ) : (
                    <>
                        <Header currentView={currentView} setCurrentView={setCurrentView} />
                        <main className="p-4 sm:p-6 lg:p-8 animate-fade-in">
                            {renderView()}
                        </main>
                    </>
                )}
            </div>
        </AppContext.Provider>
    );
};

export default App;
