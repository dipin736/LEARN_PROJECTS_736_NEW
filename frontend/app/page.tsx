'use client';

import React, { useState, useEffect } from 'react';

interface Issue {
  line: number;
  type: 'critical' | 'warning' | 'info' | 'security';
  title: string;
  description: string;
  suggested_fix?: string;
}

interface ReviewResult {
  score: number;
  summary: string;
  issues: Issue[];
  refactored_code: string;
  key_takeaways: string[];
  mode: string;
}

const SAMPLE_CODES: Record<string, { label: string; language: string; code: string }> = {
  python_sec: {
    label: "Python: Security & eval() Flaw",
    language: "python",
    code: `import os

def process_user_data(user_input):
    print("Processing input:", user_input)
    # Critical security flaw: using eval on user input
    result = eval(user_input)
    
    # Hardcoded credential
    db_password = "SuperSecretPassword123!"
    
    try:
        data = open("data.txt").read()
    except:
        print("Failed to read file")
        
    return result`
  },
  js_perf: {
    label: "JavaScript: Performance & Async Flaw",
    language: "javascript",
    code: `function fetchUserData(users) {
  let results = [];
  // Unoptimized loop with sync blocking
  for (let i = 0; i < users.length; i++) {
    console.log("Fetching user " + users[i].id);
    let data = eval("users[" + i + "]");
    results.push(data);
  }
  return results;
}`
  },
  sql_inj: {
    label: "SQL: Unsanitized Query",
    language: "sql",
    code: `SELECT user_id, username, email 
FROM users 
WHERE username = '` + `admin' OR '1'='1' -- AND status = 'active'`
  }
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5001';

export default function Home() {
  const [code, setCode] = useState(SAMPLE_CODES.python_sec.code);
  const [language, setLanguage] = useState('python');
  const [focus, setFocus] = useState('all');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [activeTab, setActiveTab] = useState<'issues' | 'refactored' | 'takeaways'>('issues');
  const [issueFilter, setIssueFilter] = useState<string>('all');
  
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [backendMode, setBackendMode] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Check Backend Health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/health`);
        if (res.ok) {
          const data = await res.json();
          setBackendStatus('online');
          setBackendMode(data.mode || 'Online');
        } else {
          setBackendStatus('offline');
        }
      } catch {
        setBackendStatus('offline');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleReview = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, focus })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to review code');

      setResult(data);
      setActiveTab('issues');
    } catch (err: any) {
      alert(`Error reviewing code: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const lineCount = code.split('\n').length;
  const filteredIssues = result?.issues.filter(i => {
    if (issueFilter === 'all') return true;
    return i.type === issueFilter;
  }) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header Bar */}
      <header style={{
        padding: '16px 32px',
        background: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '800',
            fontSize: '20px',
            boxShadow: 'var(--shadow-glow)'
          }}>
            ⚡
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.02em' }}>
              AI Code <span className="gradient-text">Reviewer</span>
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Automated Code Quality, Security & Performance Analysis
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '12px',
            fontWeight: '600',
            background: backendStatus === 'online' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: backendStatus === 'online' ? '#34d399' : '#fca5a5',
            border: `1px solid ${backendStatus === 'online' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: backendStatus === 'online' ? '#10b981' : '#ef4444'
            }} />
            {backendStatus === 'online' ? `API Online (${backendMode})` : 'API Offline'}
          </span>
        </div>
      </header>

      {/* Main Workspace */}
      <main style={{
        flex: 1,
        padding: '24px 32px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        maxWidth: '1800px',
        width: '100%',
        margin: '0 auto'
      }}>
        {/* Left Column: Editor & Options */}
        <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px' }}>
          {/* Controls Header */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: '600',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="go">Go</option>
                  <option value="sql">SQL</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Review Focus
                </label>
                <select
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: '600',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">🚀 All Checks</option>
                  <option value="security">🛡️ Security & Vulnerabilities</option>
                  <option value="performance">⚡ Performance</option>
                  <option value="clean_code">🎨 Clean Code & Style</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Load Sample Code
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value && SAMPLE_CODES[e.target.value]) {
                    const s = SAMPLE_CODES[e.target.value];
                    setCode(s.code);
                    setLanguage(s.language);
                  }
                }}
                defaultValue=""
                style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="" disabled>Presets...</option>
                <option value="python_sec">Python Security Flaw</option>
                <option value="js_perf">JavaScript Performance</option>
                <option value="sql_inj">SQL Injection</option>
              </select>
            </div>
          </div>

          {/* Editor Container */}
          <div style={{
            flex: 1,
            display: 'flex',
            position: 'relative',
            background: 'var(--bg-code)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
            minHeight: '400px'
          }}>
            {/* Line Numbers Gutter */}
            <div style={{
              width: '44px',
              padding: '14px 0',
              background: 'rgba(0, 0, 0, 0.2)',
              color: 'var(--text-muted)',
              fontSize: '13px',
              lineHeight: '1.6',
              textAlign: 'center',
              userSelect: 'none',
              borderRight: '1px solid var(--border-subtle)',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              {Array.from({ length: lineCount }).map((_, idx) => (
                <div key={idx}>{idx + 1}</div>
              ))}
            </div>

            {/* Code Textarea */}
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="// Paste your code here for automated AI review..."
              style={{
                flex: 1,
                padding: '14px 16px',
                background: 'transparent',
                color: 'var(--text-primary)',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: '13.5px',
                lineHeight: '1.6',
                fontFamily: 'JetBrains Mono, monospace',
                tabSize: 4
              }}
            />
          </div>

          {/* Editor Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {lineCount} lines | {code.length} characters
            </span>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setCode('')}
                style={{
                  padding: '10px 18px',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                Clear
              </button>

              <button
                onClick={handleReview}
                disabled={loading || !code.trim()}
                className="glow-animation"
                style={{
                  padding: '10px 24px',
                  background: loading ? 'var(--text-muted)' : 'var(--accent-gradient)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: loading || !code.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'transform 0.15s ease'
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid white',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Analyzing Code...
                  </>
                ) : (
                  <>⚡ Review Code</>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Review Results */}
        <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', minHeight: '550px' }}>
          {!result && !loading && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              padding: '40px'
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px',
                background: 'rgba(99, 102, 241, 0.1)',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                🔍
              </div>
              <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Ready to Audit Your Code
              </h3>
              <p style={{ fontSize: '13.5px', maxWidth: '400px', lineHeight: '1.6', marginBottom: '20px' }}>
                Paste any code snippet on the left or select a sample preset to scan for security vulnerabilities, syntax issues, performance bottlenecks, and best practices.
              </p>
            </div>
          )}

          {loading && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                border: '4px solid rgba(99, 102, 241, 0.2)',
                borderTopColor: 'var(--accent-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                Analyzing AST & AI Inspection...
              </p>
            </div>
          )}

          {result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Score & Summary Banner */}
              <div style={{
                background: 'rgba(11, 15, 25, 0.6)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px'
              }}>
                {/* Circle Score Meter */}
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: result.score >= 80 ? 'rgba(16, 185, 129, 0.15)' : result.score >= 60 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `3px solid ${result.score >= 80 ? '#10b981' : result.score >= 60 ? '#f59e0b' : '#ef4444'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: '20px', fontWeight: '800', color: result.score >= 80 ? '#34d399' : result.score >= 60 ? '#fde047' : '#fca5a5' }}>
                    {result.score}
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)' }}>SCORE</span>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Audit Summary
                    </h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                      Mode: {result.mode}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {result.summary}
                  </p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: '16px'
              }}>
                <button
                  onClick={() => setActiveTab('issues')}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    color: activeTab === 'issues' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    border: 'none',
                    borderBottom: activeTab === 'issues' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  🔍 Issues & Fixes ({result.issues.length})
                </button>

                <button
                  onClick={() => setActiveTab('refactored')}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    color: activeTab === 'refactored' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    border: 'none',
                    borderBottom: activeTab === 'refactored' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Refactored Code
                </button>

                <button
                  onClick={() => setActiveTab('takeaways')}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    color: activeTab === 'takeaways' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    border: 'none',
                    borderBottom: activeTab === 'takeaways' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  💡 Key Takeaways
                </button>
              </div>

              {/* Tab 1: Issues & Fixes */}
              {activeTab === 'issues' && (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                  {result.issues.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#34d399' }}>
                      ✨ Great job! No critical issues found in this code snippet.
                    </div>
                  ) : (
                    filteredIssues.map((issue, idx) => (
                      <div key={idx} style={{
                        background: 'rgba(11, 15, 25, 0.5)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '800',
                              fontFamily: 'JetBrains Mono, monospace'
                            }} className={
                              issue.type === 'critical' ? 'badge-critical' :
                              issue.type === 'warning' ? 'badge-warning' : 'badge-info'
                            }>
                              LINE {issue.line}
                            </span>
                            <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
                              {issue.title}
                            </span>
                          </div>
                        </div>

                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                          {issue.description}
                        </p>

                        {issue.suggested_fix && (
                          <div style={{
                            marginTop: '6px',
                            background: 'var(--bg-code)',
                            borderRadius: '6px',
                            padding: '10px 12px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            position: 'relative'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: '#a5b4fc' }}>
                                Suggested Fix:
                              </span>
                              <button
                                onClick={() => handleCopy(issue.suggested_fix!, `fix-${idx}`)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}
                              >
                                {copiedId === `fix-${idx}` ? '✓ Copied' : '📋 Copy Fix'}
                              </button>
                            </div>
                            <pre style={{ fontSize: '12px', color: '#6ee7b7', margin: 0, overflowX: 'auto' }}>
                              {issue.suggested_fix}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 2: Refactored Code */}
              {activeTab === 'refactored' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Cleaned & Optimized Output:
                    </span>
                    <button
                      onClick={() => handleCopy(result.refactored_code, 'refactored')}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: '#a5b4fc',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {copiedId === 'refactored' ? '✓ Copied Code' : '📋 Copy Code'}
                    </button>
                  </div>
                  <pre style={{
                    flex: 1,
                    background: 'var(--bg-code)',
                    padding: '16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    overflow: 'auto',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    color: '#6ee7b7'
                  }}>
                    {result.refactored_code}
                  </pre>
                </div>
              )}

              {/* Tab 3: Key Takeaways */}
              {activeTab === 'takeaways' && (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {result.key_takeaways.map((takeaway, idx) => (
                    <div key={idx} style={{
                      padding: '12px 16px',
                      background: 'rgba(11, 15, 25, 0.5)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '13.5px',
                      color: 'var(--text-primary)'
                    }}>
                      <span style={{ color: 'var(--accent-primary)', fontWeight: '800' }}>•</span>
                      {takeaway}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
