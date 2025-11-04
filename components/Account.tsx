
import React, { useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { CreditIcon } from './Icons';

const Account: React.FC = () => {
    const context = useContext(AppContext);

    if (!context) return null;
    const { user, credits, addCredits } = context;

    const creditPacks = [
        { amount: 5, price: 4.99 },
        { amount: 12, price: 9.99, bestValue: true },
        { amount: 30, price: 19.99 },
    ];

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
                <h2 className="text-3xl font-bold mb-2 text-brand-pink">Buy More Credits</h2>
                <p className="text-brand-muted mb-6">Each credit lets you generate one amazing pet dance video!</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {creditPacks.map((pack) => (
                        <div key={pack.amount} className={`relative border-2 rounded-xl p-6 text-center transition-all duration-300 ${pack.bestValue ? 'border-brand-pink scale-105 bg-brand-pink/10' : 'border-brand-muted hover:border-brand-purple'}`}>
                             {pack.bestValue && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-pink text-white text-xs font-bold px-3 py-1 rounded-full">BEST VALUE</div>
                             )}
                            <div className="flex items-center justify-center mb-2">
                                <span className="text-4xl font-extrabold">{pack.amount}</span>
                                <CreditIcon className="w-8 h-8 text-brand-yellow ml-2"/>
                            </div>
                            <p className="text-2xl font-bold text-gray-300 mb-4">${pack.price}</p>
                            <button
                                onClick={() => addCredits(pack.amount)}
                                className="w-full bg-brand-purple text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-purple/80 transition-colors"
                            >
                                Buy Now
                            </button>
                        </div>
                    ))}
                </div>
                 <p className="text-xs text-brand-muted mt-6 text-center">
                    Credits will be added to your account after successful payment processing.
                </p>
            </div>

            {/* Dev Tool: Add Credits (remove in production) */}
            {import.meta.env.DEV && (
                <div className="bg-yellow-900/20 border-2 border-yellow-500 p-6 rounded-xl">
                    <h2 className="text-xl font-bold mb-4 text-yellow-400">🔧 Dev Tool: Add Test Credits</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => addCredits(20)}
                            className="bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors"
                        >
                            Add 20 Credits
                        </button>
                        <button
                            onClick={() => addCredits(100)}
                            className="bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors"
                        >
                            Add 100 Credits
                        </button>
                    </div>
                    <p className="text-xs text-yellow-300 mt-2">This only works in development mode</p>
                </div>
            )}
        </div>
    );
};

export default Account;
