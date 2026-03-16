import React, { useState } from 'react';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useAuth } from '@site/src/context/AuthContext';
import { useHistory } from '@docusaurus/router';

export default function LoginPage() {
  const { siteConfig } = useDocusaurusContext();
  const backendApiUrl = (siteConfig.customFields?.backendApiUrl as string) ?? 'https://physical-ai-humanoid-robotics-textbook-production-95f1.up.railway.app';
  const { signIn } = useAuth();
  const history = useHistory();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${backendApiUrl}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail ?? 'Sign in failed');
        return;
      }
      const { token } = await res.json();
      await signIn(token);
      history.push('/docs');
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Login" description="Sign in to your account">
      <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
        <div style={{ background: 'var(--ifm-card-background-color, #fff)', padding: '32px', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', border: '1px solid var(--ifm-color-emphasis-200)' }}>
          <h1 style={{ margin: '0 0 4px' }}>Sign In</h1>
          <p style={{ margin: '0 0 20px', color: 'var(--ifm-color-secondary-darkest)', fontSize: '0.95rem' }}>Welcome back</p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 4, border: '1px solid #ccc', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 4, border: '1px solid #ccc', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />
            </label>
            {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '11px', borderRadius: 4, background: 'var(--ifm-color-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.3px' }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p style={{ marginTop: 16, marginBottom: 0 }}>
            Don't have an account? <a href="/physical-ai-humanoid-robotics-textbook/signup">Sign up</a>
          </p>
        </div>
      </div>
    </Layout>
  );
}
