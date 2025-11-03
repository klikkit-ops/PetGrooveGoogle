
import React, { useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { View } from '../types';
import { CreditIcon, LogoutIcon } from './Icons';

interface HeaderProps {
    currentView: View;
    setCurrentView: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, setCurrentView }) => {
    const context = useContext(AppContext);

    if (!context) return null;
    const { user, credits, logout } = context;

    const navItems: { id: View; label: string }[] = [
        { id: 'generate', label: 'Generate' },
        { id: 'my-videos', label: 'My Videos' },
        { id: 'account', label: 'Account' },
    ];

    return (
        <header className="bg-brand-surface sticky top-0 z-10 shadow-lg">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-8">
                        <div className="flex items-center space-x-2">
                           <span className="text-2xl">🐾</span>
                           <h1 className="text-xl font-bold text-brand-yellow">Pet Dance Party</h1>
                        </div>
                        <nav className="hidden md:flex space-x-4">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setCurrentView(item.id)}
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                                        currentView === item.id
                                            ? 'bg-brand-purple text-white'
                                            : 'text-gray-300 hover:bg-brand-muted hover:text-white'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                    <div className="flex items-center space-x-4">
                         <div className="flex items-center bg-brand-muted px-3 py-1.5 rounded-full text-sm">
                            <CreditIcon className="w-5 h-5 text-brand-yellow mr-2" />
                            <span className="font-bold">{credits}</span>
                            <span className="ml-1 text-gray-300">Credits</span>
                        </div>
                        <div className="hidden sm:block text-sm text-gray-300">{user?.name}</div>
                        <button onClick={logout} className="p-2 rounded-full text-gray-300 hover:bg-brand-muted hover:text-white transition-colors duration-200" aria-label="Logout">
                           <LogoutIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                 {/* Mobile Navigation */}
                 <nav className="md:hidden flex justify-around p-2 border-t border-brand-muted">
                     {navItems.map((item) => (
                         <button
                             key={item.id}
                             onClick={() => setCurrentView(item.id)}
                             className={`flex-1 text-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                                 currentView === item.id
                                     ? 'bg-brand-purple text-white'
                                     : 'text-gray-300 hover:bg-brand-muted hover:text-white'
                             }`}
                         >
                             {item.label}
                         </button>
                     ))}
                 </nav>
            </div>
        </header>
    );
};

export default Header;
