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

    // Wait a moment for the database trigger to create the user profile
    // The trigger will automatically create the user profile in users table
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Fetch the created user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      // If profile wasn't created by trigger (trigger might not exist yet),
      // try to create it manually as fallback
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: data.email,
        });

      if (insertError) {
        console.error('Failed to create user profile:', insertError);
        // Return a more descriptive error
        const errorMessage = insertError.message || insertError.code || 'Database error saving new user';
        return { 
          user: null, 
          error: new Error(`Failed to create user profile: ${errorMessage}. Please make sure the database trigger is set up correctly.`) 
        };
      }
      
      // Wait a moment and fetch the newly created profile
      await new Promise(resolve => setTimeout(resolve, 500));
      const { data: newProfile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
        
      if (fetchError || !newProfile) {
        return { 
          user: null, 
          error: new Error(`User profile created but could not be retrieved: ${fetchError?.message || 'Unknown error'}`) 
        };
      }
      
      return {
        user: {
          id: newProfile.id,
          email: newProfile.email,
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

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

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
        console.error('Failed to create user profile:', insertError);
        // If insert fails, try fetching again (maybe trigger created it)
        const { data: retryProfile, error: retryError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        if (retryError || !retryProfile) {
          return { user: null, error: insertError || retryError || new Error('User profile not found') };
        }
        
        // Use the retry profile
        return {
          user: {
            id: retryProfile.id,
            email: retryProfile.email,
            name: retryProfile.name || undefined,
          },
          error: null,
        };
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

