import { resetPasswordRedirectUrl, verifyRedirectUrl } from '@/lib/auth-links';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isRecovering: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; alreadyRegistered: boolean }>;
  resendVerification: (email: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  beginRecovery: (accessToken: string, refreshToken: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  finishRecovery: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // True while the user is setting a new password from a reset link. The reset link
  // signs them in, so the route guard needs this to keep them on the reset screen.
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    // Check if the user is already logged in from last time
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for login or logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: verifyRedirectUrl() },
    });
    // With email confirmation on, Supabase returns no error for an existing address
    // (to avoid leaking which emails are registered) but the user has no identities.
    const alreadyRegistered =
      (!error && data.user?.identities?.length === 0) ||
      error?.code === 'user_already_exists' ||
      /already registered/i.test(error?.message ?? '');
    return { error: alreadyRegistered ? null : error, alreadyRegistered };
  };

  const resendVerification = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: verifyRedirectUrl() },
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetPasswordRedirectUrl(),
    });
    return { error };
  };

  const beginRecovery = async (accessToken: string, refreshToken: string) => {
    setIsRecovering(true);
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) setIsRecovering(false);
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  // Sign out first, then clear the flag, so the route guard never sees a
  // signed-in user outside recovery mode and bounces them into the app.
  const finishRecovery = async () => {
    await supabase.auth.signOut();
    setIsRecovering(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
        user,
        session,
        isLoading,
        isRecovering,
        signIn,
        signUp,
        resendVerification,
        resetPassword,
        beginRecovery,
        updatePassword,
        finishRecovery,
        signOut,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);