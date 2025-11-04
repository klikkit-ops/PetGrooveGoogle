
import React, { useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { CreditIcon } from './Icons';

const Account: React.FC = () => {
    const context = useContext(AppContext);

    if (!context) return null;
    const { user, credits, addCredits } = context;

    // Subscription plans removed - now using inline subscription UI

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-slide-in-up">
            <div className="bg-brand-surface p-8 rounded-xl shadow-lg">
                <h1 className="text-3xl font-bold mb-2 text-brand-yellow">My Account</h1>
                <p className="text-brand-muted mb-6">Here's your account information.</p>
                <div className="space-y-4 text-lg">
                    <div className="flex items-center">
                        <span className="font-bold w-32">Username:</span>
                        <span className="text-gray-300">{user?.name}</span>
                    </div>
                     <div className="flex items-center">
                        <span className="font-bold w-32">Email:</span>
                        <span className="text-gray-300">{user?.email}</span>
                    </div>
                    <div className="flex items-center">
                        <span className="font-bold w-32">Credits:</span>
                        <span className="text-brand-yellow font-extrabold">{credits}</span>
                    </div>
                </div>
            </div>

             <div className="bg-brand-surface p-8 rounded-xl shadow-lg">
                <h2 className="text-3xl font-bold mb-2 text-brand-pink">Subscribe & Generate</h2>
                <p className="text-brand-muted mb-6">Each video generation requires 500 credits. Choose a plan that works for you!</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Weekly Plan */}
                    <div className="relative border-2 rounded-xl p-6 bg-gradient-to-br from-brand-purple/20 to-brand-pink/20 border-brand-purple">
                        <div className="absolute -top-3 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                            7-Day Trial
                        </div>
                        <div className="flex items-center justify-center mb-4">
                            <span className="text-4xl font-extrabold text-brand-yellow">1000</span>
                            <CreditIcon className="w-8 h-8 text-brand-yellow ml-2"/>
                        </div>
                        <p className="text-center text-lg font-semibold text-gray-300 mb-2">Weekly</p>
                        <div className="space-y-2 mb-4">
                            <div className="flex items-center text-sm text-gray-300">
                                <span className="text-green-400 mr-2">✔</span>
                                <span>Up to 2 Video Generations</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-300">
                                <span className="text-green-400 mr-2">✔</span>
                                <span>Cancel anytime</span>
                            </div>
                        </div>
                        <div className="text-center mb-4">
                            <p className="text-3xl font-bold text-brand-yellow">US$0.49</p>
                            <p className="text-sm text-gray-400">for 7 days</p>
                            <p className="text-xs text-gray-500 mt-1">then US$7.99/week</p>
                        </div>
                        <button
                            onClick={() => addCredits(1000)}
                            className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors"
                        >
                            Start 7-Day Trial
                        </button>
                    </div>

                    {/* Annual Plan */}
                    <div className="relative border-2 rounded-xl p-6 bg-gradient-to-br from-brand-yellow/20 to-brand-purple/20 border-brand-yellow">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-pink text-white text-xs font-bold px-3 py-1 rounded-full">
                            BEST VALUE
                        </div>
                        <div className="flex items-center justify-center mb-4">
                            <span className="text-4xl font-extrabold text-brand-yellow">48000</span>
                            <CreditIcon className="w-8 h-8 text-brand-yellow ml-2"/>
                        </div>
                        <p className="text-center text-lg font-semibold text-gray-300 mb-2">Annual</p>
                        <div className="space-y-2 mb-4">
                            <div className="flex items-center text-sm text-gray-300">
                                <span className="text-green-400 mr-2">✔</span>
                                <span>Up to 96 Video Generations</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-300">
                                <span className="text-green-400 mr-2">✔</span>
                                <span>Save 86% vs Weekly</span>
                            </div>
                        </div>
                        <div className="text-center mb-4">
                            <p className="text-3xl font-bold text-brand-yellow">US$69.99</p>
                            <p className="text-sm text-gray-400">per year</p>
                            <p className="text-xs text-gray-500 mt-1">~US$5.83/month</p>
                        </div>
                        <button
                            onClick={() => addCredits(48000)}
                            className="w-full bg-brand-yellow text-brand-bg font-bold py-3 px-4 rounded-lg hover:bg-brand-yellow/90 transition-colors"
                        >
                            Select Annual
                        </button>
                    </div>
                </div>

                <div className="bg-green-900/20 border border-green-500 rounded-lg p-4 mb-4">
                    <p className="text-green-400 text-sm font-semibold text-center">
                        30-Day money back guarantee
                    </p>
                </div>

                <p className="text-xs text-brand-muted text-center">
                    This order process is conducted by our online reseller. By subscribing, you agree to our Terms of Use. 
                    You can cancel your subscription anytime. Credits will be added to your account after successful payment processing.
                </p>
            </div>

            {/* Dev Tool: Add Credits (remove in production) */}
            {import.meta.env.DEV && (
                <div className="bg-yellow-900/20 border-2 border-yellow-500 p-6 rounded-xl">
                    <h2 className="text-xl font-bold mb-4 text-yellow-400">🔧 Dev Tool: Add Test Credits</h2>
                    <p className="text-sm text-yellow-300 mb-4">Each generation requires 500 credits.</p>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => addCredits(500)}
                            className="bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors"
                        >
                            Add 500 Credits (1 Gen)
                        </button>
                        <button
                            onClick={() => addCredits(1000)}
                            className="bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors"
                        >
                            Add 1000 Credits (2 Gens)
                        </button>
                        <button
                            onClick={() => addCredits(5000)}
                            className="bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors"
                        >
                            Add 5000 Credits (10 Gens)
                        </button>
                    </div>
                    <p className="text-xs text-yellow-300 mt-2">This only works in development mode</p>
                </div>
            )}
        </div>
    );
};

export default Account;
