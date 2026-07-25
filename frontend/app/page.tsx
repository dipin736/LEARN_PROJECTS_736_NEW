'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  context?: string;
  timestamp: string;
}

const PRESET_QUESTIONS = [
  'How many annual and sick leave days do I get?',
  'What are the working hours and flexible login timing?',
  'What is the work from home policy?',
  'What is the travel policy and meal allowance?',
  'What is the notice period requirement?'
];


const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5001';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: 'Hello! I am your Hospital Helper AI. Ask me any question regarding hospital policies, visiting hours, or handbooks.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [activeContext, setActiveContext] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Check Python Backend Health Status on Mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/health`);
        if (res.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch (err) {
        setBackendStatus('offline');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const question = (textToSend || input).trim();
    if (!question || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get answer from backend');
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: data.answer || 'No response returned.',
        context: data.context || undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (error: any) {
      console.error('Error fetching RAG response:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: `Error connecting to Python backend (${error.message || 'Server offline'}). Ensure Flask app is running on port 5001.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon-wrapper">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              <path d="M12 5v14"/>
              <path d="M5 12h14"/>
            </svg>
          </div>
          <div>
            <h1 className="brand-title">Hospital Helper AI</h1>
            <p className="brand-subtitle">Powered by Python Flask RAG + ChromaDB & Next.js</p>
          </div>
        </div>

        <div className={`status-badge ${backendStatus === 'online' ? '' : 'offline'}`}>
          <span className="status-dot"></span>
          <span>{backendStatus === 'online' ? 'Python API Online' : backendStatus === 'checking' ? 'Checking API...' : 'Python API Offline'}</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Chat Section */}
        <section className="chat-section">
          <div className="messages-container">
            {messages.map(msg => (
              <div key={msg.id} className={`message-wrapper ${msg.sender} animate-fade-in`}>
                <div className={`avatar ${msg.sender}`}>
                  {msg.sender === 'bot' ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 8V4H8"/>
                      <rect width="16" height="12" x="4" y="8" rx="2"/>
                      <path d="M2 14h2"/>
                      <path d="M20 14h2"/>
                      <path d="M15 13v2"/>
                      <path d="M9 13v2"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  )}
                </div>

                <div>
                  <div className="message-bubble">
                    {msg.text}

                    {msg.context && (
                      <div>
                        <button
                          className="context-button"
                          onClick={() => setActiveContext(activeContext === msg.context ? null : msg.context!)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                          </svg>
                          {activeContext === msg.context ? 'Hide Retrieved PDF Context' : 'View RAG Context Chunk'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="message-wrapper bot animate-fade-in">
                <div className="avatar bot">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/>
                  </svg>
                </div>
                <div className="message-bubble">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="suggestions-container">
            {PRESET_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                className="suggestion-chip"
                onClick={() => handleSendMessage(q)}
                disabled={loading}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                {q}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <div className="input-container">
            <form
              className="input-form"
              onSubmit={e => {
                e.preventDefault();
                handleSendMessage();
              }}
            >
              <input
                type="text"
                className="text-input"
                placeholder="Ask about hospital policies, procedures, handbook..."
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={loading}
              />
              <button type="submit" className="send-button" disabled={loading || !input.trim()}>
                <span>Send</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4Z"/>
                  <path d="M22 2 11 13"/>
                </svg>
              </button>
            </form>
          </div>
        </section>

        {/* Side Panel for RAG Context Chunk (if active) */}
        {activeContext && (
          <aside className="context-panel animate-fade-in">
            <div className="panel-header">
              <div className="panel-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                Retrieved RAG Context
              </div>
              <button className="close-btn" onClick={() => setActiveContext(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Source chunk extracted from <strong style={{ color: '#fff' }}>company_handbook_rag_sample.pdf</strong> via ChromaDB vector search:
            </p>
            <div className="context-body">
              {activeContext}
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
