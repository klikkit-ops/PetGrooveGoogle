import { supabase } from './supabaseClient';

export interface SignUpData {
  email: string;
  password: string;
  name: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
}

/**
 * Sign up a new user
 */
export const signUp = async (data: SignUpData): Promise<{ user: UserProfile | null; error: Error | null }> => {
  try {
    // Sign up with Supabase Auth
    // Pass name in metadata so the trigger can use it
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
        },
      },
    });

    if (authError) {
      return { user: null, error: authError };
    }

    if (!authData.user) {
      return { user: null, error: new Error('Failed to create user') };
    }

    // Wait a moment for the database trigger to create the user profile
    // The trigger will automatically:
    // 1. Create the user profile in users table
    // 2. Grant 3 free credits
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
          name: data.name,
        });

      if (insertError) {
        console.error('Failed to create user profile:', insertError);
        return { user: null, error: insertError };
      }

      // Try to add credits if they weren't added by trigger
      await supabase
        .from('credits')
        .insert({
          user_id: authData.user.id,
          amount: 3,
          source: 'free',
        });
    }

    return {
      user: {
        id: authData.user.id,
        email: data.email,
        name: data.name,
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
        name: profile.name,
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

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      return { user: null, error: profileError || new Error('User profile not found') };
    }

    return {
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
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

