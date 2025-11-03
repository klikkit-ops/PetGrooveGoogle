
import React, { useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import VideoCard from './VideoCard';

const MyVideos: React.FC = () => {
    const context = useContext(AppContext);

    if (!context) return null;
    const { videos } = context;

    return (
        <div className="max-w-7xl mx-auto animate-slide-in-up">
            <h1 className="text-3xl font-bold mb-6 text-brand-yellow">My Generated Videos</h1>
            {videos.length === 0 ? (
                <div className="text-center py-20 bg-brand-surface rounded-xl">
                    <p className="text-5xl mb-4">🖼️</p>
                    <h2 className="text-xl text-gray-300">You haven't generated any videos yet.</h2>
                    <p className="text-brand-muted">Go to the 'Generate' tab to create your first masterpiece!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {videos.map(video => (
                        <VideoCard key={video.id} video={video} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyVideos;
