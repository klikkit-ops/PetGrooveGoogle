
import React, { useState } from 'react';
import { signUp, signIn, signInWithGoogle } from '../services/authService';
import { User } from '../types';

interface LoginProps {
    onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [isSignUp, setIsSignUp] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        setError('');
        setGoogleLoading(true);

        try {
            const { error: googleError } = await signInWithGoogle();
            if (googleError) {
                setError(googleError.message || 'Failed to sign in with Google');
                setGoogleLoading(false);
            }
            // If successful, the redirect will happen automatically
            // The OAuth callback will be handled by the App component
        } catch (err) {
            setError('An unexpected error occurred');
            setGoogleLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isSignUp) {
                const { user, error: signUpError } = await signUp({
                    email,
                    password,
                });

                if (signUpError) {
                    console.error('Sign up error:', signUpError);
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
                    {isSignUp ? 'Welcome to PetGroove!' : 'Welcome Back!'}
                </h1>
                    <p className="text-gray-300 mb-6">
                        {isSignUp
                            ? "Create an account to turn your furry friends into dancing stars."
                            : 'Sign in to continue creating amazing pet dance videos.'}
                    </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-brand-muted text-white px-4 py-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-brand-purple focus:outline-none"
                            disabled={loading || googleLoading}
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
                            disabled={loading || googleLoading}
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
                        disabled={loading || googleLoading}
                        className="w-full bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-600"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-brand-surface text-gray-400">Or continue with</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGoogleSignIn}
                        disabled={loading || googleLoading}
                        className="mt-4 w-full flex items-center justify-center gap-3 bg-white text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {googleLoading ? (
                            'Loading...'
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="currentColor"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                Sign in with Google
                            </>
                        )}
                    </button>
                </div>

                <div className="mt-6">
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError('');
                            setEmail('');
                            setPassword('');
                        }}
                        className="text-brand-yellow hover:underline text-sm"
                        disabled={loading || googleLoading}
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
