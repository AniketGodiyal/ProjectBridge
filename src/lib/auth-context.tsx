import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Membership, Organization, Profile, UserRole } from '@/lib/types';

export type DemoPersonaKey = 'student' | 'resource_manager' | 'lab_manager' | 'institute_admin' | 'platform_admin';

export const DEMO_PERSONA_ORDER: DemoPersonaKey[] = [
  'student',
  'resource_manager',
  'lab_manager',
  'institute_admin',
  'platform_admin',
];

export const DEMO_PERSONA_TITLE: Record<DemoPersonaKey, string> = {
  student: 'Student',
  resource_manager: 'Resource Manager',
  lab_manager: 'Faculty / Lab Manager',
  institute_admin: 'Institute Administrator',
  platform_admin: 'Platform Administrator',
};

const PERSONA_ROLE: Record<DemoPersonaKey, UserRole> = {
  student: 'student',
  resource_manager: 'manager',
  lab_manager: 'manager',
  institute_admin: 'institute_admin',
  platform_admin: 'platform_admin',
};

export const ROLE_HOME: Record<UserRole, string> = {
  student: '/dashboard',
  manager: '/manage',
  institute_admin: '/admin',
  platform_admin: '/platform',
};

export interface DemoPersona {
  key: DemoPersonaKey;
  label: string;
  userId: string;
  role: UserRole;
}

export interface DemoActor {
  id: string;
  email: string | null;
}

interface PersonaRow {
  persona_key: DemoPersonaKey;
  user_id: string;
  label: string;
}

interface DemoState {
  personas: DemoPersona[];
  profiles: Profile[];
  memberships: Membership[];
}

interface AuthContextValue {
  user: DemoActor | null;
  profile: Profile | null;
  memberships: Membership[];
  activeRole: UserRole | null;
  activeOrgId: string | null;
  activeOrganization: Organization | null;
  isPlatformAdmin: boolean;
  loading: boolean;
  error: string | null;
  personas: DemoPersona[];
  activePersona: DemoPersona | null;
  switchPersona: (key: DemoPersonaKey) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PERSONA_STORAGE_KEY = 'projectbridge-demo-persona';

async function fetchPersonaRows(): Promise<PersonaRow[]> {
  const { data, error } = await supabase.from('demo_personas').select('persona_key, user_id, label');
  if (error) throw error;
  return (data as PersonaRow[] | null) ?? [];
}

async function fetchDemoState(): Promise<DemoState> {
  let rows = await fetchPersonaRows();
  if (rows.length === 0) {
    const { error } = await supabase.rpc('demo_seed');
    if (error) throw error;
    rows = await fetchPersonaRows();
  }
  if (rows.length === 0) throw new Error('The sample data could not be created.');

  const personas: DemoPersona[] = DEMO_PERSONA_ORDER.flatMap((key) => {
    const row = rows.find((r) => r.persona_key === key);
    return row ? [{ key, label: row.label, userId: row.user_id, role: PERSONA_ROLE[key] }] : [];
  });
  const userIds = personas.map((p) => p.userId);

  const [profilesRes, membershipsRes] = await Promise.all([
    supabase.from('profiles').select('*').in('id', userIds),
    supabase.from('memberships').select('*, organization:organizations(*)').in('user_id', userIds).eq('status', 'active'),
  ]);
  if (profilesRes.error) throw profilesRes.error;
  if (membershipsRes.error) throw membershipsRes.error;

  return {
    personas,
    profiles: (profilesRes.data as Profile[] | null) ?? [],
    memberships: (membershipsRes.data as Membership[] | null) ?? [],
  };
}

function readStoredPersona(): DemoPersonaKey {
  const stored = localStorage.getItem(PERSONA_STORAGE_KEY);
  return DEMO_PERSONA_ORDER.find((k) => k === stored) ?? 'student';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState | null>(null);
  const [activeKey, setActiveKey] = useState<DemoPersonaKey>(readStoredPersona);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      setState(await fetchDemoState());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The sample data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const personas = useMemo(() => state?.personas ?? [], [state]);
  const activePersona = useMemo(
    () => personas.find((p) => p.key === activeKey) ?? personas[0] ?? null,
    [personas, activeKey]
  );
  const actorId = activePersona?.userId ?? null;
  const user = useMemo<DemoActor | null>(() => (actorId ? { id: actorId, email: null } : null), [actorId]);
  const memberships = useMemo(
    () => (state && actorId ? state.memberships.filter((m) => m.user_id === actorId) : []),
    [state, actorId]
  );
  const profile = useMemo(
    () => (state && actorId ? state.profiles.find((p) => p.id === actorId) ?? null : null),
    [state, actorId]
  );
  const activeOrganization = useMemo(
    () => state?.memberships.find((m) => m.organization)?.organization ?? null,
    [state]
  );

  const switchPersona = useCallback((key: DemoPersonaKey) => {
    setActiveKey(key);
    localStorage.setItem(PERSONA_STORAGE_KEY, key);
  }, []);

  const value: AuthContextValue = {
    user,
    profile,
    memberships,
    activeRole: activePersona?.role ?? null,
    activeOrgId: activeOrganization?.id ?? null,
    activeOrganization,
    isPlatformAdmin: activePersona?.role === 'platform_admin',
    loading,
    error,
    personas,
    activePersona,
    switchPersona,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
