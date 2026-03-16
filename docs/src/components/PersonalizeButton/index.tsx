import React, { useState } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useLocation } from '@docusaurus/router';
import { useAuth } from '@site/src/context/AuthContext';

interface PersonalizeButtonProps {
  chapterSlug: string;
}

export default function PersonalizeButton({ chapterSlug }: PersonalizeButtonProps) {
  const { siteConfig } = useDocusaurusContext();
  const backendApiUrl = (siteConfig.customFields?.backendApiUrl as string) ?? 'https://physical-ai-humanoid-robotics-textbook-production-95f1.up.railway.app';
  const { token, user } = useAuth();
  const [personalized, setPersonalized] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <a href="/login" style={{
        display: 'inline-block',
        padding: '6px 14px',
        borderRadius: 4,
        background: '#43A047',
        color: '#fff',
        fontWeight: 600,
        fontSize: 13,
        textDecoration: 'none',
      }}>
        Sign in to personalize
      </a>
    );
  }

  async function handleClick() {
    if (open) {
      setOpen(false);
      return;
    }
    if (personalized) {
      setOpen(true);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${backendApiUrl}/personalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter_slug: chapterSlug, token }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail ?? 'Personalization failed');
        return;
      }
      const data = await res.json();
      setPersonalized(data.personalized);
      setOpen(true);
    } catch {
      setError('Could not reach the server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          padding: '6px 14px',
          borderRadius: 4,
          background: 'var(--ifm-color-primary)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {loading ? 'Personalizing…' : open ? 'Hide Personalized Intro' : 'Personalize for Me'}
      </button>
      {error && <p style={{ color: 'red', marginTop: 8, fontSize: 13 }}>{error}</p>}
      {open && personalized && (
        <div
          style={{
            marginTop: 12,
            padding: '12px 16px',
            background: 'var(--ifm-background-surface-color)',
            border: '1px solid var(--ifm-color-primary)',
            borderRadius: 6,
            fontSize: 14,
            whiteSpace: 'pre-wrap',
          }}
        >
          <strong style={{ display: 'block', marginBottom: 8, color: 'var(--ifm-color-primary)' }}>
            Personalized for {user.name} ({user.software_level})
          </strong>
          {personalized}
        </div>
      )}
    </div>
  );
}
