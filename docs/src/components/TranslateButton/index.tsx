import React, { useState, useRef } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function TranslateButton() {
  const { siteConfig } = useDocusaurusContext();
  const backendApiUrl = (siteConfig.customFields?.backendApiUrl as string) ?? 'https://physical-ai-humanoid-robotics-textbook-production-95f1.up.railway.app';
  const [translated, setTranslated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const originalHtmlRef = useRef<string | null>(null);

  async function handleClick() {
    const article = document.querySelector('article');
    if (!article) return;

    if (translated) {
      // Restore original
      if (originalHtmlRef.current !== null) {
        article.innerHTML = originalHtmlRef.current;
      }
      setTranslated(false);
      return;
    }

    setLoading(true);
    setError('');
    const content = article.innerText;
    originalHtmlRef.current = article.innerHTML;

    try {
      const res = await fetch(`${backendApiUrl}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail ?? 'Translation failed');
        return;
      }
      const data = await res.json();
      article.innerHTML = `<div style="direction:rtl;text-align:right;font-size:1.05em;line-height:1.8">${data.translated.replace(/\n/g, '<br/>')}</div>`;
      setTranslated(true);
    } catch {
      setError('Could not reach the server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          padding: '6px 14px',
          borderRadius: 4,
          background: translated ? '#0097A7' : '#00BCD4',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 13,
          padding: '7px 16px',
          letterSpacing: '0.3px',
        }}
      >
        {loading ? 'Translating…' : translated ? 'Show Original' : 'اردو میں پڑھیں'}
      </button>
      {error && <p style={{ color: 'red', marginTop: 8, fontSize: 13 }}>{error}</p>}
    </div>
  );
}
