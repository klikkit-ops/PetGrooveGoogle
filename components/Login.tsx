
import React, { useContext } from 'react';
import { AppContext } from '../contexts/AppContext';

const Login: React.FC = () => {
    const context = useContext(AppContext);

    if (!context) return null;
    const { login } = context;
    
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-bg to-gray-900 p-4">
            <div className="w-full max-w-md text-center bg-brand-surface rounded-2xl shadow-2xl p-8 animate-slide-in-up">
                 <div className="mx-auto mb-6">
                    <span className="text-7xl animate-pulse-slow">🐾</span>
                 </div>
                <h1 className="text-4xl font-extrabold text-brand-yellow mb-2">Welcome to Pet Dance Party!</h1>
                <p className="text-gray-300 mb-8">Create an account to turn your furry friends into dancing stars. You'll get 3 free credits to start!</p>
                <button
                    onClick={login}
                    className="w-full bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg"
                >
                    Create My Free Account
                </button>
                <p className="text-xs text-brand-muted mt-6">
                    This is a demo application. Clicking the button will create a mock account and grant you free credits.
                </p>
            </div>
        </div>
    );
};

export default Login;
