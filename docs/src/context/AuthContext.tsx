import React, { createContext, useContext, useState, useEffect } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  software_level: string;
  jetson_access: boolean;
  rtx_gpu_access: boolean;
}

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  signIn: async () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { siteConfig } = useDocusaurusContext();
  const backendApiUrl = (siteConfig.customFields?.backendApiUrl as string) ?? 'https://physical-ai-humanoid-robotics-textbook-production-95f1.up.railway.app';

  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchMe(tok: string): Promise<UserProfile | null> {
    try {
      const res = await fetch(`${backendApiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem('auth_token');
    if (stored) {
      fetchMe(stored).then(profile => {
        if (profile) {
          setToken(stored);
          setUser(profile);
        } else {
          localStorage.removeItem('auth_token');
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  async function signIn(tok: string) {
    localStorage.setItem('auth_token', tok);
    setToken(tok);
    const profile = await fetchMe(tok);
    setUser(profile);
  }

  function signOut() {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
