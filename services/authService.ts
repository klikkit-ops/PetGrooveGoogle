import { supabase } from './supabaseClient';

export interface SignUpData {
  email: string;
  password: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
}

/**
 * Sign up a new user
 * Returns user only if email confirmation is disabled or user is already confirmed
 * Otherwise returns null user with a message about email confirmation
 */
export const signUp = async (data: SignUpData): Promise<{ user: UserProfile | null; error: Error | null }> => {
  try {
    const normalizedEmail = data.email.toLowerCase().trim();
    
    // Check if user already exists in public.users
    const { data: existingProfile, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingProfile && !checkError) {
      return { 
        user: null, 
        error: new Error('An account with this email already exists. Please sign in instead.') 
      };
    }

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: data.password,
    });

    if (authError) {
      const errorMessage = authError.message?.toLowerCase() || '';
      const errorCode = authError.status || authError.code || '';
      
      if (errorMessage.includes('already registered') || 
          errorMessage.includes('already exists') ||
          errorMessage.includes('already been registered') ||
          errorMessage.includes('user already registered') ||
          errorCode === 'email_already_exists' ||
          errorCode === 'user_already_exists') {
        return { 
          user: null, 
          error: new Error('An account with this email already exists. Please sign in instead.') 
        };
      }
      
      return { user: null, error: authError };
    }

    if (!authData.user) {
      return { user: null, error: new Error('Failed to create user') };
    }

    // Check if email confirmation is required
    // If there's no session, it could mean:
    // 1. Email confirmation is required (new user)
    // 2. Email already exists in auth.users (duplicate)
    // To distinguish, check if user was just created by checking if email_confirmed_at is null
    if (!authData.session) {
      // If email_confirmed_at is null, it's a new unconfirmed user
      // If email_confirmed_at exists, it means the email already exists (Supabase returned existing user)
      if (authData.user.email_confirmed_at) {
        // Email already exists and is confirmed - they should sign in
        return {
          user: null,
          error: new Error('An account with this email already exists. Please sign in instead.'),
        };
      }
      
      // New user needs email confirmation
      return {
        user: null,
        error: new Error('Please check your email to confirm your account before signing in.'),
      };
    }

    // User is signed in (email confirmed or confirmation disabled)
    // Wait for profile to be created by trigger
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profile && !profileError) {
      return {
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.name || undefined,
        },
        error: null,
      };
    }

    // Profile not found yet, but user is authenticated
    // Return auth user info - profile will be created by trigger
    return {
      user: {
        id: authData.user.id,
        email: normalizedEmail,
      },
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error : new Error('Unknown error during signup'),
    };
  }
};

    // User is signed in (email confirmed or confirmation disabled)
    // Wait for profile to be created by trigger
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profile && !profileError) {
      return {
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.name || undefined,
        },
        error: null,
      };
    }

    // Profile not found yet, but user is authenticated
    // Return auth user info - profile will be created by trigger
    return {
      user: {
        id: authData.user.id,
        email: normalizedEmail,
      },
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error : new Error('Unknown error during signup'),
    };
  }
};

/**
 * Sign in an existing user
 * Properly handles email confirmation errors
 */
export const signIn = async (data: SignInData): Promise<{ user: UserProfile | null; error: Error | null }> => {
  try {
    const normalizedEmail = data.email.toLowerCase().trim();
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: data.password,
    });

    if (authError) {
      // Check for email confirmation error
      const errorMessage = authError.message?.toLowerCase() || '';
      
      if (errorMessage.includes('email not confirmed') || 
          errorMessage.includes('email address not confirmed') ||
          errorMessage.includes('signup_disabled')) {
        return { 
          user: null, 
          error: new Error('Please check your email and confirm your account before signing in.') 
        };
      }
      
      // Return the original error for other cases
      return { user: null, error: authError };
    }

    if (!authData.user) {
      return { user: null, error: new Error('Failed to sign in') };
    }

    // Wait a moment for profile to be available
    await new Promise(resolve => setTimeout(resolve, 500));

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle(); // Use maybeSingle() to handle missing profiles gracefully

    if (profile && !profileError) {
      return {
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.name || undefined,
        },
        error: null,
      };
    }

    // Profile doesn't exist - trigger should create it
    // Return auth user info so app doesn't hang
    return {
      user: {
        id: authData.user.id,
        email: authData.user.email || normalizedEmail,
      },
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error : new Error('Unknown error during sign in'),
    };
  }
};

/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`,
      },
    });

    if (error) {
      return { error };
    }

    // OAuth redirect will happen, so we return success
    // The actual sign-in will be handled by the redirect callback
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unknown error during Google sign in'),
    };
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unknown error during sign out'),
    };
  }
};

/**
 * Get the current authenticated user
 * Simplified version that doesn't hang on profile queries
 */
export const getCurrentUser = async (): Promise<{ user: UserProfile | null; error: Error | null }> => {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { user: null, error: authError || new Error('No authenticated user') };
    }

    // Try to fetch profile with a timeout
    const profilePromise = supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    const timeoutPromise = new Promise((resolve) => 
      setTimeout(() => resolve({ data: null, error: null }), 2000)
    );

    const { data: profile, error: profileError } = await Promise.race([
      profilePromise,
      timeoutPromise
    ]) as { data: any; error: any };

    // If profile exists, return it
    if (profile && !profileError) {
      return {
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.name || undefined,
        },
        error: null,
      };
    }

    // Profile doesn't exist yet or query timed out - return auth user info anyway
    // The trigger should create the profile, and it will be available on next load
    return {
      user: {
        id: authUser.id,
        email: authUser.email || '',
      },
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error : new Error('Unknown error getting current user'),
    };
  }
};

