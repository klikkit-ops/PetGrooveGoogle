
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

    // Load user session on mount and handle auth state changes
    useEffect(() => {
        const loadUserSession = async () => {
            try {
                setLoading(true);
                
                // Check for existing session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) {
                    console.error('Error getting session:', sessionError);
                    setLoading(false);
                    return;
                }
                
                if (session?.user) {
                    // Session exists, get user profile with timeout
                    const getUserPromise = getCurrentUser();
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('getCurrentUser timeout')), 10000)
                    );
                    
                    try {
                        const { user: currentUser, error } = await Promise.race([
                            getUserPromise,
                            timeoutPromise
                        ]) as { user: UserProfile | null; error: Error | null };
                        
                        if (currentUser && !error) {
                            setUser(currentUser);
                            await loadUserData(currentUser.id);
                        } else {
                            console.warn('Failed to get user profile:', error);
                            // Don't sign out - profile might be created by trigger
                            // Just show login screen
                        }
                    } catch (error) {
                        console.error('Error or timeout getting user:', error);
                        // On timeout or error, just show login screen
                    }
                }
            } catch (error) {
                console.error('Error loading user session:', error);
            } finally {
                setLoading(false);
            }
        };

        loadUserSession();

        // Listen for auth state changes (e.g., OAuth callback)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            // Prevent handling if we're already loading
            if (isLoadingSession) {
                return;
            }
            
            try {
                console.log('Auth state changed:', event, session?.user?.id);
                
                if (event === 'SIGNED_IN' && session?.user) {
                    // Only update if we don't already have a user (to prevent duplicate loads)
                    if (!user) {
                        setIsLoadingSession(true);
                        // Wait a bit for the database trigger to create the profile
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        const { user: currentUser, error } = await getCurrentUser();
                        if (currentUser && !error) {
                            setUser(currentUser);
                            await loadUserData(currentUser.id);
                        } else {
                            console.error('Failed to get user after sign in:', error);
                        }
                        setIsLoadingSession(false);
                    }
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setCredits(0);
                    setVideos([]);
                } else if (event === 'TOKEN_REFRESHED' && user) {
                    // Only refresh if we have a user - silently refresh user data
                    const { user: currentUser, error } = await getCurrentUser();
                    if (currentUser && !error) {
                        setUser(currentUser);
                    }
                }
            } catch (error) {
                console.error('Error handling auth state change:', error);
            } finally {
                setIsLoadingSession(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [loadUserData, user, isLoadingSession]);

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
