
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
    const userRef = useRef<User | null>(null);

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
                    // Session exists, get user profile with timeout
                    try {
                        const getUserPromise = getCurrentUser();
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Timeout getting user')), 5000)
                        );
                        
                        const { user: currentUser, error } = await Promise.race([
                            getUserPromise,
                            timeoutPromise
                        ]) as { user: UserProfile | null; error: Error | null };
                        
                        if (!mounted) return;
                        
                        if (currentUser && !error) {
                            userRef.current = currentUser;
                            setUser(currentUser);
                            // Don't await - load in background to prevent hanging
                            loadUserData(currentUser.id).catch(err => {
                                console.error('Error loading user data:', err);
                            });
                        } else {
                            console.warn('Failed to get user profile:', error);
                            // If there's an error but session exists, still set user from auth
                            // This prevents hanging
                            const authUser = {
                                id: session.user.id,
                                email: session.user.email || '',
                            };
                            userRef.current = authUser;
                            setUser(authUser);
                            // Don't await - load in background
                            loadUserData(session.user.id).catch(err => {
                                console.error('Error loading user data:', err);
                            });
                        }
                    } catch (error) {
                        console.error('Error or timeout getting user:', error);
                        if (!mounted) return;
                        // On error/timeout, still proceed with auth user
                        if (session.user) {
                            const authUser = {
                                id: session.user.id,
                                email: session.user.email || '',
                            };
                            userRef.current = authUser;
                            setUser(authUser);
                            // Don't await - load in background
                            loadUserData(session.user.id).catch(err => {
                                console.error('Error loading user data:', err);
                            });
                        }
                    }
                } else {
                    // No session
                    userRef.current = null;
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

        // Listen for auth state changes (e.g., OAuth callback)
        // Only handle SIGNED_IN and SIGNED_OUT - ignore TOKEN_REFRESHED and INITIAL_SESSION
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            // Only handle actual sign in/out events, ignore everything else
            if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') {
                return;
            }
            
            try {
                console.log('Auth state changed:', event, session?.user?.id);
                
                if (event === 'SIGNED_IN' && session?.user) {
                    // Only update if we don't already have a user (check ref to avoid closure issues)
                    if (!userRef.current) {
                        const { user: currentUser, error } = await getCurrentUser();
                        if (currentUser && !error) {
                            userRef.current = currentUser;
                            setUser(currentUser);
                            await loadUserData(currentUser.id);
                        }
                    }
                } else if (event === 'SIGNED_OUT') {
                    userRef.current = null;
                    setUser(null);
                    setCredits(0);
                    setVideos([]);
                }
            } catch (error) {
                console.error('Error handling auth state change:', error);
            }
        });

        // Listen for auth state changes (e.g., OAuth callback, sign out)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            // Ignore INITIAL_SESSION and TOKEN_REFRESHED to prevent unnecessary reloads
            if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
                return;
            }
            
            try {
                if (event === 'SIGNED_IN' && session?.user) {
                    // Only update if we don't already have a user
                    if (!userRef.current) {
                        setLoading(true);
                        const { user: currentUser, error } = await getCurrentUser();
                        if (currentUser && !error) {
                            userRef.current = currentUser;
                            setUser(currentUser);
                            loadUserData(currentUser.id).catch(err => {
                                console.error('Error loading user data:', err);
                            });
                        } else if (session.user) {
                            // Fallback to auth user
                            const authUser = {
                                id: session.user.id,
                                email: session.user.email || '',
                            };
                            userRef.current = authUser;
                            setUser(authUser);
                            loadUserData(session.user.id).catch(err => {
                                console.error('Error loading user data:', err);
                            });
                        }
                        setLoading(false);
                    }
                } else if (event === 'SIGNED_OUT') {
                    userRef.current = null;
                    setUser(null);
                    setCredits(0);
                    setVideos([]);
                }
            } catch (error) {
                console.error('Error handling auth state change:', error);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [loadUserData]);

    const handleLogin = useCallback((loggedInUser: User) => {
        userRef.current = loggedInUser;
        setUser(loggedInUser);
        loadUserData(loggedInUser.id);
    }, [loadUserData]);

    const handleLogout = useCallback(async () => {
        await supabaseSignOut();
        userRef.current = null;
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
