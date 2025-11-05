
export interface User {
    id: string;
    name?: string;
    email: string;
}

export interface GeneratedVideo {
    id: string;
    dance: string;
    videoUrl: string;
    thumbnailUrl: string;
    timestamp: Date;
}

export type View = 'generate' | 'my-videos' | 'account';

export interface AppContextType {
    user: User | null;
    credits: number;
    videos: GeneratedVideo[];
    login: () => void;
    logout: () => void;
    addCredits: (amount: number) => void;
    useCredit: () => void;
    addVideo: (video: GeneratedVideo) => void;
    setCurrentView: (view: View) => void;
}
