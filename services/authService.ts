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
 */
export const signUp = async (data: SignUpData): Promise<{ user: UserProfile | null; error: Error | null }> => {
  try {
    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      return { user: null, error: authError };
    }

    if (!authData.user) {
      return { user: null, error: new Error('Failed to create user') };
    }

    // For email signup, Supabase requires email confirmation
    // The user profile will be created by the trigger, but we need to wait
    // If email confirmation is required, the user won't be fully authenticated yet
    // In that case, we should return success and let them confirm their email
    
    // Check if email confirmation is required
    if (authData.user && !authData.session) {
      // Email confirmation required - return success with user info
      // The profile will be created by the trigger, and they can fetch it after confirming email
      return {
        user: {
          id: authData.user.id,
          email: data.email,
        },
        error: null,
      };
    }

    // If session exists (email already confirmed or confirmation disabled),
    // wait for the database trigger to create the user profile
    // Retry multiple times as the trigger might take a moment to execute
    let profile = null;
    let profileError = null;
    const maxRetries = 5;
    
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, 500 + (i * 200))); // Increasing delays
      
      // Try to fetch the profile
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no rows gracefully
        
      if (data && !error) {
        profile = data;
        break;
      }
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        profileError = error;
      }
    }

    // If profile wasn't found, that's okay - it might be created by the trigger later
    // Or RLS might be blocking the query temporarily
    // Since auth signup succeeded, return success
    // The profile will be available when they log in
    if (!profile) {
      console.warn('Profile not found immediately after signup, but auth user was created. Profile will be available after login.');
      // Return success anyway - the trigger will create the profile
      return {
        user: {
          id: authData.user.id,
          email: data.email,
        },
        error: null,
      };
    }

    return {
      user: {
        id: authData.user.id,
        email: data.email,
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
 */
export const signIn = async (data: SignInData): Promise<{ user: UserProfile | null; error: Error | null }> => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      return { user: null, error: authError };
    }

    if (!authData.user) {
      return { user: null, error: new Error('Failed to sign in') };
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      return { user: null, error: profileError || new Error('User profile not found') };
    }

    return {
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name || undefined,
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
 */
export const getCurrentUser = async (): Promise<{ user: UserProfile | null; error: Error | null }> => {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { user: null, error: authError || new Error('No authenticated user') };
    }

    // Wait a moment for the database trigger to create the user profile (if it exists)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Wait a moment for the database trigger to create the user profile (if it exists)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Fetch user profile - use maybeSingle() to handle case where profile doesn't exist yet
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    // If profile doesn't exist (e.g., first-time Google sign-in), create it
    // But only if the error is "not found", not an RLS error
    if ((profileError && profileError.code === 'PGRST116') || !profile) {

    // If profile doesn't exist (e.g., first-time Google sign-in), create it
    if (profileError || !profile) {
      const email = authUser.email || '';

      // Try to create the profile
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: email,
        });

      if (insertError) {
        console.error('Failed to create user profile (will be created by trigger):', insertError);
        // If insert fails (likely RLS), wait a bit longer and try fetching again
        // The trigger should have created it by now
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: retryProfile, error: retryError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
        
        if (retryProfile && !retryError) {
          // Profile was created by trigger
          return {
            user: {
              id: retryProfile.id,
              email: retryProfile.email,
              name: retryProfile.name || undefined,
            },
            error: null,
          };
        }
        
        // Still no profile - return error but don't block auth
        // The profile will be created eventually by the trigger
        return { user: null, error: new Error('User profile not found - trigger may still be creating it') };
      }

      // Return the newly created profile
      return {
        user: {
          id: authUser.id,
          email: email,
        },
        error: null,
      };
    }

    return {
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name || undefined,
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

