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
    // First, check if a user with this email already exists in public.users table
    // Note: supabase.from('users') accesses public.users (not auth.users)
    // auth.users is managed by Supabase Auth and is not accessible via .from()
    // This prevents duplicate signups even if Supabase Auth allows it
    const normalizedEmail = data.email.toLowerCase().trim();
    
    const { data: existingProfile, error: checkError } = await supabase
      .from('users') // This references public.users table
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingProfile && !checkError) {
      // User already exists - prevent signup
      console.warn('Attempted signup with existing email:', normalizedEmail);
      return { 
        user: null, 
        error: new Error('An account with this email already exists. Please sign in instead.') 
      };
    }

    // Also check auth.users by attempting to sign in with a dummy password
    // If the email exists in auth.users, we'll get "Invalid login credentials" error
    // This catches cases where auth.users has the email but public.users doesn't
    const { error: signInCheckError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: 'DUMMY_CHECK_' + Date.now() + '_' + Math.random(), // Unique dummy password
    });

    if (signInCheckError) {
      const errorMsg = signInCheckError.message?.toLowerCase() || '';
      
      // These errors indicate the email EXISTS in auth.users
      if (errorMsg.includes('invalid login credentials') || 
          errorMsg.includes('incorrect') ||
          errorMsg.includes('wrong password') ||
          errorMsg.includes('email not confirmed') ||
          errorMsg.includes('email address not confirmed')) {
        // Email exists in auth.users - prevent signup
        console.warn('Attempted signup with existing email in auth.users:', normalizedEmail);
        return { 
          user: null, 
          error: new Error('An account with this email already exists. Please sign in instead.') 
        };
      }
      // Other errors (like "email not found") are fine - email doesn't exist
    } else {
      // If signIn somehow succeeds, that means email exists - sign out and prevent signup
      await supabase.auth.signOut();
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
      // Check for duplicate email error - Supabase returns different error codes/messages
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
      
      // Log the actual error for debugging
      console.error('Supabase signup error:', {
        message: authError.message,
        status: authError.status,
        code: authError.code,
        error: authError
      });
      
      return { user: null, error: authError };
    }

    if (!authData.user) {
      return { user: null, error: new Error('Failed to create user') };
    }

    // Double-check: After signup, verify no duplicate was created in public.users
    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { data: profiles, error: verifyError } = await supabase
      .from('users') // This references public.users table
      .select('id, email')
      .eq('email', normalizedEmail);

    // If multiple profiles exist, this is a problem
    if (!verifyError && profiles && profiles.length > 1) {
      console.error('Duplicate user detected after signup:', {
        newUserId: authData.user.id,
        existingProfiles: profiles,
        email: normalizedEmail
      });
      // Sign out the new user since a duplicate was created
      await supabase.auth.signOut();
      return { 
        user: null, 
        error: new Error('An account with this email already exists. Please sign in instead.') 
      };
    }

    // Check if email confirmation is required
    if (authData.user && !authData.session) {
      // Email confirmation required - return success with user info
      // The profile will be created by the trigger, and they can fetch it after confirming email
      return {
        user: {
          id: authData.user.id,
          email: normalizedEmail,
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
          email: normalizedEmail,
        },
        error: null,
      };
    }

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

    // Fetch user profile - use maybeSingle() to handle case where profile doesn't exist yet
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

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

    // Profile doesn't exist yet - trigger should create it
    // Return auth user info anyway so the app doesn't hang
    // The profile will be available on next refresh or login
    console.warn('Profile not found for user', authUser.id, '- trigger should create it. Returning auth user info.');
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

