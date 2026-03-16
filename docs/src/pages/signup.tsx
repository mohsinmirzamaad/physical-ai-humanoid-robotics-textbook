import React, { useState } from 'react';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useAuth } from '@site/src/context/AuthContext';
import { useHistory } from '@docusaurus/router';

export default function SignupPage() {
  const { siteConfig } = useDocusaurusContext();
  const backendApiUrl = (siteConfig.customFields?.backendApiUrl as string) ?? 'https://physical-ai-humanoid-robotics-textbook-production-95f1.up.railway.app';
  const { signIn } = useAuth();
  const history = useHistory();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [softwareLevel, setSoftwareLevel] = useState('beginner');
  const [jetsonAccess, setJetsonAccess] = useState(false);
  const [rtxGpuAccess, setRtxGpuAccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${backendApiUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          software_level: softwareLevel,
          jetson_access: jetsonAccess,
          rtx_gpu_access: rtxGpuAccess,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail ?? 'Sign up failed');
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

  const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%', marginTop: 4,
    padding: '8px 10px', borderRadius: 4, border: '1px solid #ccc',
  };

  return (
    <Layout title="Sign Up" description="Create your account">
      <div style={{ maxWidth: 440, margin: '80px auto', padding: '0 16px' }}>
        <h1>Sign Up</h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label>
            Name
            <input type="text" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
          </label>
          <label>
            Software Experience Level
            <select value={softwareLevel} onChange={e => setSoftwareLevel(e.target.value)} style={inputStyle}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={jetsonAccess} onChange={e => setJetsonAccess(e.target.checked)} />
            I have access to an NVIDIA Jetson device
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={rtxGpuAccess} onChange={e => setRtxGpuAccess(e.target.checked)} />
            I have access to an NVIDIA RTX GPU
          </label>
          {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '10px', borderRadius: 4, background: 'var(--ifm-color-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <p style={{ marginTop: 16 }}>
          Already have an account? <a href="/physical-ai-humanoid-robotics-textbook/login">Sign in</a>
        </p>
      </div>
    </Layout>
  );
}
