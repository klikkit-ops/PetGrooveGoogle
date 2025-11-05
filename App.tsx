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

    // Load user data (videos and credits)
    const loadUserData = useCallback(async (userId: string) => {
        try {
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
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }, []);

    // Initialize auth state - simplified approach similar to headshots-starter
    useEffect(() => {
        let mounted = true;

        // Get initial session with timeout protection
        const sessionTimeout = setTimeout(() => {
            if (mounted) {
                console.warn('Session check timed out, proceeding without session');
                setUser(null);
                setLoading(false);
            }
        }, 5000);

        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                clearTimeout(sessionTimeout);
                if (!mounted) return;
                
                if (session?.user) {
                    // User is logged in, fetch their profile with timeout
                    const userTimeout = setTimeout(() => {
                        if (mounted) {
                            console.warn('User fetch timed out, using auth user');
                            setUser({
                                id: session.user.id,
                                email: session.user.email || '',
                            });
                            loadUserData(session.user.id);
                            setLoading(false);
                        }
                    }, 3000);

                    getCurrentUser()
                        .then(({ user: currentUser, error }) => {
                            clearTimeout(userTimeout);
                            if (!mounted) return;
                            
                            if (currentUser && !error) {
                                setUser(currentUser);
                                loadUserData(currentUser.id);
                            } else {
                                // Fallback to auth user
                                setUser({
                                    id: session.user.id,
                                    email: session.user.email || '',
                                });
                                loadUserData(session.user.id);
                            }
                            setLoading(false);
                        })
                        .catch((error) => {
                            clearTimeout(userTimeout);
                            console.error('Error getting current user:', error);
                            if (!mounted) return;
                            // Fallback to auth user on error
                            setUser({
                                id: session.user.id,
                                email: session.user.email || '',
                            });
                            loadUserData(session.user.id);
                            setLoading(false);
                        });
                } else {
                    // No session
                    setUser(null);
                    setLoading(false);
                }
            })
            .catch((error) => {
                clearTimeout(sessionTimeout);
                console.error('Error getting session:', error);
                if (!mounted) return;
                setUser(null);
                setLoading(false);
            });

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            if (event === 'SIGNED_IN' && session?.user) {
                // User signed in
                const { user: currentUser, error } = await getCurrentUser();
                if (currentUser && !error) {
                    setUser(currentUser);
                    loadUserData(currentUser.id);
                } else {
                    setUser({
                        id: session.user.id,
                        email: session.user.email || '',
                    });
                    loadUserData(session.user.id);
                }
            } else if (event === 'SIGNED_OUT') {
                // User signed out
                setUser(null);
                setCredits(0);
                setVideos([]);
                setCurrentView('generate');
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [loadUserData]);

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
            const { credits: updatedCredits } = await getUserCredits(user.id);
            setCredits(updatedCredits);
        }
    }, [user]);

    const useCredit = useCallback(async () => {
        if (!user) return;
        
        const { error } = await useUserCredit(user.id);
        if (!error) {
            const { credits: updatedCredits } = await getUserCredits(user.id);
            setCredits(updatedCredits);
        }
    }, [user]);

    const addVideo = useCallback(async (video: GeneratedVideo) => {
        if (!user) return;
        
        setVideos(prev => [video, ...prev]);
        
        const { error } = await saveVideo(user.id, video);
        if (error) {
            console.error('Failed to save video:', error);
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
        setCurrentView,
    }), [user, credits, videos, handleLogin, handleLogout, addCredits, useCredit, addVideo, setCurrentView]);

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
