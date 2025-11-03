
import React from 'react';
import { GeneratedVideo } from '../types';

interface VideoCardProps {
    video: GeneratedVideo;
}

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
    return (
        <div className="bg-brand-surface rounded-lg shadow-lg overflow-hidden group transition-transform duration-300 hover:scale-105">
            <div className="aspect-square w-full bg-black flex items-center justify-center">
                <video src={video.videoUrl} loop controls className="w-full h-full object-cover" poster={video.thumbnailUrl} />
            </div>
            <div className="p-4">
                <h3 className="font-bold text-lg truncate text-gray-200">{video.dance}</h3>
                <p className="text-sm text-brand-muted">{video.timestamp.toLocaleDateString()}</p>
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
