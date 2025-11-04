
import React, { useState } from 'react';
import { signUp, signIn } from '../services/authService';
import { User } from '../types';

interface LoginProps {
    onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [isSignUp, setIsSignUp] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isSignUp) {
                if (!name.trim()) {
                    setError('Please enter your name');
                    setLoading(false);
                    return;
                }

                const { user, error: signUpError } = await signUp({
                    email,
                    password,
                    name: name.trim(),
                });

                if (signUpError) {
                    setError(signUpError.message || 'Failed to create account');
                } else if (user) {
                    onLogin(user);
                }
            } else {
                const { user, error: signInError } = await signIn({
                    email,
                    password,
                });

                if (signInError) {
                    setError(signInError.message || 'Failed to sign in');
                } else if (user) {
                    onLogin(user);
                }
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-bg to-gray-900 p-4">
            <div className="w-full max-w-md text-center bg-brand-surface rounded-2xl shadow-2xl p-8 animate-slide-in-up">
                <div className="mx-auto mb-6">
                    <span className="text-7xl animate-pulse-slow">🐾</span>
                </div>
                <h1 className="text-4xl font-extrabold text-brand-yellow mb-2">
                    {isSignUp ? 'Welcome to Pet Dance Party!' : 'Welcome Back!'}
                </h1>
                <p className="text-gray-300 mb-6">
                    {isSignUp
                        ? "Create an account to turn your furry friends into dancing stars. You'll get 3 free credits to start!"
                        : 'Sign in to continue creating amazing pet dance videos.'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isSignUp && (
                        <div>
                            <input
                                type="text"
                                placeholder="Your Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-brand-muted text-white px-4 py-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-brand-purple focus:outline-none"
                                disabled={loading}
                            />
                        </div>
                    )}
                    <div>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-brand-muted text-white px-4 py-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-brand-purple focus:outline-none"
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full bg-brand-muted text-white px-4 py-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-brand-purple focus:outline-none"
                            disabled={loading}
                        />
                        {isSignUp && (
                            <p className="text-xs text-brand-muted mt-1 text-left">Password must be at least 6 characters</p>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {loading ? 'Loading...' : isSignUp ? 'Create My Free Account' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6">
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError('');
                            setEmail('');
                            setPassword('');
                            setName('');
                        }}
                        className="text-brand-yellow hover:underline text-sm"
                        disabled={loading}
                    >
                        {isSignUp
                            ? 'Already have an account? Sign in'
                            : "Don't have an account? Sign up"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
