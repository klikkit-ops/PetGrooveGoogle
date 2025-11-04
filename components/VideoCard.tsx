
import React, { useState } from 'react';
import { GeneratedVideo } from '../types';

interface VideoCardProps {
    video: GeneratedVideo;
}

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
    const [videoError, setVideoError] = useState(false);
    const [isBlobUrl, setIsBlobUrl] = useState(video.videoUrl.startsWith('blob:'));

    // Detect if this is a blob URL (temporary, won't work after page reload)
    // Blob URLs are in format: blob:http://localhost:3000/xxx
    const handleVideoError = () => {
        if (isBlobUrl || video.videoUrl.startsWith('blob:')) {
            setVideoError(true);
        }
    };

    return (
        <div className="bg-brand-surface rounded-lg shadow-lg overflow-hidden group transition-transform duration-300 hover:scale-105">
            <div className="aspect-[9/16] w-full bg-black flex items-center justify-center">
                {videoError || isBlobUrl ? (
                    <div className="text-center text-gray-400 p-4">
                        <p className="text-sm">Video unavailable</p>
                        <p className="text-xs mt-2">This video was generated before the fix. Please generate a new video.</p>
                    </div>
                ) : (
                    <video 
                        src={video.videoUrl} 
                        loop 
                        controls 
                        className="w-full h-full object-cover" 
                        poster={video.thumbnailUrl}
                        onError={handleVideoError}
                        crossOrigin="anonymous"
                    />
                )}
            </div>
            <div className="p-4">
                <h3 className="font-bold text-lg truncate text-gray-200">{video.dance}</h3>
                <p className="text-sm text-brand-muted">
                    {video.timestamp.toLocaleDateString()} {video.timestamp.toLocaleTimeString()}
                </p>
                <a
                    href={video.videoUrl}
                    download={`pet-dance-${video.dance.replace(/\s+/g, '-')}.mp4`}
                    className="mt-3 w-full block bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-center"
                >
                    Download
                </a>
            </div>
        </div>
    );
};

export default VideoCard;
