
import React, { useState, useMemo, useCallback } from 'react';
import { User, GeneratedVideo, AppContextType, View } from './types';
import { AppContext } from './contexts/AppContext';
import Header from './components/Header';
import Login from './components/Login';
import VideoGenerator from './components/VideoGenerator';
import MyVideos from './components/MyVideos';
import Account from './components/Account';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [credits, setCredits] = useState<number>(0);
    const [videos, setVideos] = useState<GeneratedVideo[]>([]);
    const [currentView, setCurrentView] = useState<View>('generate');

    const handleLogin = useCallback(() => {
        setUser({ name: 'PetLover99', email: 'user@example.com' });
        setCredits(3); // Start with 3 free credits
    }, []);

    const handleLogout = useCallback(() => {
        setUser(null);
        setCredits(0);
        setVideos([]);
        setCurrentView('generate');
    }, []);

    const addCredits = useCallback((amount: number) => {
        setCredits(prev => prev + amount);
    }, []);

    const useCredit = useCallback(() => {
        setCredits(prev => (prev > 0 ? prev - 1 : 0));
    }, []);

    const addVideo = useCallback((video: GeneratedVideo) => {
        setVideos(prev => [video, ...prev]);
    }, []);

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
    
    return (
        <AppContext.Provider value={contextValue}>
            <div className="min-h-screen bg-brand-bg font-sans">
                {!user ? (
                    <Login />
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
