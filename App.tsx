
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
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [credits, setCredits] = useState<number>(0);
    const [videos, setVideos] = useState<GeneratedVideo[]>([]);
    const [currentView, setCurrentView] = useState<View>('generate');
    const [loading, setLoading] = useState<boolean>(true);
    const [isLoadingSession, setIsLoadingSession] = useState<boolean>(false);

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

    // Load user session on mount only
    useEffect(() => {
        let mounted = true;
        let sessionLoaded = false;
        
        const loadUserSession = async () => {
            // Prevent multiple loads
            if (sessionLoaded) {
                return;
            }
            
            try {
                sessionLoaded = true;
                setLoading(true);
                
                // Check for existing session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (!mounted) return;
                
                if (sessionError) {
                    console.error('Error getting session:', sessionError);
                    setLoading(false);
                    return;
                }
                
                if (session?.user) {
                    // Session exists, get user profile
                    const { user: currentUser, error } = await getCurrentUser();
                    
                    if (!mounted) return;
                    
                    if (currentUser && !error) {
                        setUser(currentUser);
                        await loadUserData(currentUser.id);
                    } else {
                        console.warn('Failed to get user profile:', error);
                    }
                } else {
                    // No session
                    setUser(null);
                }
            } catch (error) {
                console.error('Error loading user session:', error);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadUserSession();
        
        return () => {
            mounted = false;
        };

        // Listen for auth state changes (e.g., OAuth callback)
        // Only handle SIGNED_IN and SIGNED_OUT - ignore TOKEN_REFRESHED and INITIAL_SESSION
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            try {
                // Only log important events
                if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                    console.log('Auth state changed:', event, session?.user?.id);
                }
                
                if (event === 'SIGNED_IN' && session?.user && !user) {
                    // Only update if we don't already have a user
                    // Don't set loading - let the app continue normally
                    const { user: currentUser, error } = await getCurrentUser();
                    if (currentUser && !error) {
                        setUser(currentUser);
                        await loadUserData(currentUser.id);
                    }
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setCredits(0);
                    setVideos([]);
                }
                // Ignore TOKEN_REFRESHED and INITIAL_SESSION to prevent unnecessary reloads
            } catch (error) {
                console.error('Error handling auth state change:', error);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [loadUserData, user]);

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
