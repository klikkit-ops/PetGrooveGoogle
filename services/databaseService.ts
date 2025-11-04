import { supabase } from './supabaseClient';
import { GeneratedVideo } from '../types';

/**
 * Get all videos for a user
 */
export const getUserVideos = async (userId: string): Promise<{ videos: GeneratedVideo[]; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { videos: [], error };
    }

    const videos: GeneratedVideo[] = (data || []).map((video) => ({
      id: video.id,
      dance: video.dance_type,
      videoUrl: video.video_url,
      thumbnailUrl: video.thumbnail_url || '',
      timestamp: new Date(video.created_at),
    }));

    return { videos, error: null };
  } catch (error) {
    return {
      videos: [],
      error: error instanceof Error ? error : new Error('Unknown error fetching videos'),
    };
  }
};

/**
 * Save a video to the database
 */
export const saveVideo = async (userId: string, video: GeneratedVideo): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('videos')
      .insert({
        user_id: userId,
        dance_type: video.dance,
        video_url: video.videoUrl,
        thumbnail_url: video.thumbnailUrl,
      });

    return { error };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unknown error saving video'),
    };
  }
};

/**
 * Get total credits for a user
 */
export const getUserCredits = async (userId: string): Promise<{ credits: number; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('credits')
      .select('amount')
      .eq('user_id', userId);

    if (error) {
      return { credits: 0, error };
    }

    const totalCredits = (data || []).reduce((sum, credit) => sum + credit.amount, 0);
    return { credits: totalCredits, error: null };
  } catch (error) {
    return {
      credits: 0,
      error: error instanceof Error ? error : new Error('Unknown error fetching credits'),
    };
  }
};

/**
 * Add credits to a user's account
 */
export const addUserCredits = async (
  userId: string,
  amount: number,
  source: 'free' | 'purchase' | 'referral' = 'purchase'
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('credits')
      .insert({
        user_id: userId,
        amount,
        source,
      });

    return { error };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unknown error adding credits'),
    };
  }
};

/**
 * Use a credit (decrement by 1)
 * This is done by adding a negative credit entry
 */
export const useUserCredit = async (userId: string): Promise<{ error: Error | null }> => {
  try {
    // Check if user has credits
    const { credits } = await getUserCredits(userId);
    if (credits <= 0) {
      return { error: new Error('Insufficient credits') };
    }

    // Add a negative credit entry
    const { error } = await supabase
      .from('credits')
      .insert({
        user_id: userId,
        amount: -1,
        source: 'used',
      });

    return { error };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unknown error using credit'),
    };
  }
};

