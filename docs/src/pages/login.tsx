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
        <h1>Sign In</h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 4, border: '1px solid #ccc' }}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 4, border: '1px solid #ccc' }}
            />
          </label>
          {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '10px', borderRadius: 4, background: 'var(--ifm-color-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p style={{ marginTop: 16 }}>
          Don't have an account? <a href="/physical-ai-humanoid-robotics-textbook/signup">Sign up</a>
        </p>
      </div>
    </Layout>
  );
}
