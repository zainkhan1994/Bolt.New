import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Membership, Organization, Profile } from '@/types';

interface AuthResult {
  error: string | null;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  memberships: Membership[];
  /** True until the initial session (and, if signed in, the profile) has loaded. */
  loading: boolean;
  lastEvent: AuthChangeEvent | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  refreshMemberships: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadAccount(userId: string): Promise<{ profile: Profile | null; memberships: Membership[] }> {
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

  if (profile?.is_super_admin) {
    // RLS lets super admins read every organization.
    const { data: orgs } = await supabase.from('organizations').select('*').order('name');
    return {
      profile,
      memberships: (orgs ?? []).map((organization) => ({ organization, role: 'super_admin' as const })),
    };
  }

  const { data: rows } = await supabase
    .from('organization_members')
    .select('role, organization:organizations(*)')
    .eq('user_id', userId);

  const memberships = (rows ?? [])
    .filter((row): row is typeof row & { organization: Organization } => row.organization !== null)
    .map((row) => ({ organization: row.organization, role: row.role }))
    .sort((a, b) => a.organization.name.localeCompare(b.organization.name));

  return { profile: profile ?? null, memberships };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [accountUserId, setAccountUserId] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<AuthChangeEvent | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });

    // Keep this callback synchronous: awaiting Supabase calls inside it can deadlock the auth client.
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      setLastEvent(event);
      setSession(next);
      setSessionLoaded(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setMemberships([]);
      setAccountUserId(null);
      return;
    }
    let cancelled = false;
    loadAccount(userId).then((account) => {
      if (cancelled) return;
      setProfile(account.profile);
      setMemberships(account.memberships);
      setAccountUserId(userId);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const refreshMemberships = useCallback(async () => {
    if (!userId) return;
    const account = await loadAccount(userId);
    setProfile(account.profile);
    setMemberships(account.memberships);
  }, [userId]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    // Server-side audit entry; failures here must not block sign-in.
    await supabase.rpc('record_login').then(() => undefined, () => undefined);
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const sendPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  }, []);

  const loading = !sessionLoaded || (userId !== null && accountUserId !== userId);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      memberships,
      loading,
      lastEvent,
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      updatePassword,
      refreshMemberships,
    }),
    [session, profile, memberships, loading, lastEvent, signIn, signUp, signOut, sendPasswordReset, updatePassword, refreshMemberships],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
