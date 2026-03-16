import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './styles.module.css';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

type Message = { role: 'user' | 'assistant'; text: string };

interface TooltipState {
  text: string;
  x: number;
  y: number;
}

export default function Chatbot(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const { siteConfig } = useDocusaurusContext();
  const chatbotApiUrl = (siteConfig.customFields?.chatbotApiUrl as string) ?? 'http://localhost:8001/chat';

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendMessage = useCallback(async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(chatbotApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.answer ?? 'No response.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error: could not reach the backend.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Text selection detection
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      const selection = window.getSelection()?.toString().trim();
      if (!selection) {
        return;
      }
      // Only show tooltip if click was outside the chatbot panel
      if (panelRef.current?.contains(e.target as Node)) {
        return;
      }
      setTooltip({ text: selection, x: e.clientX, y: e.clientY });
    };

    const handleClick = (e: MouseEvent) => {
      // Dismiss tooltip if clicking outside it
      const target = e.target as HTMLElement;
      if (!target.closest(`.${styles.selectionTooltip}`)) {
        // Only clear if there's no new selection being made
        setTimeout(() => {
          const sel = window.getSelection()?.toString().trim();
          if (!sel) setTooltip(null);
        }, 0);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const handleTooltipClick = () => {
    if (!tooltip) return;
    const framed = `Tell me more about this excerpt:\n\n"${tooltip.text}"`;
    setOpen(true);
    setTooltip(null);
    setTimeout(() => sendMessage(framed), 50);
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        className={styles.floatButton}
        onClick={() => setOpen(prev => !prev)}
        aria-label="Toggle chat assistant"
        title="Textbook Assistant"
      >
        {open ? (
          // X icon
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          // Chat bubble icon
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className={styles.panel} ref={panelRef}>
          <div className={styles.header}>
            <span>Textbook Assistant</span>
            <button onClick={() => setOpen(false)} aria-label="Close chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className={styles.messages}>
            {messages.length === 0 && (
              <p className={styles.emptyState}>Ask any question about the textbook content.</p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={msg.role === 'user' ? styles.userMsg : styles.assistantMsg}
              >
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className={styles.assistantMsg}>
                <span className={styles.loading}>···</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.inputRow}>
            <textarea
              ref={inputRef}
              className={styles.textarea}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question… (Enter to send)"
              rows={2}
            />
            <button
              className={styles.sendButton}
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              aria-label="Send"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Text selection tooltip */}
      {tooltip && (
        <button
          className={styles.selectionTooltip}
          style={{ left: tooltip.x + 8, top: tooltip.y - 36 }}
          onClick={handleTooltipClick}
        >
          Ask about this ✨
        </button>
      )}
    </>
  );
}
