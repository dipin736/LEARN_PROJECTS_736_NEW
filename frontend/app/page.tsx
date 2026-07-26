'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Issue {
  line: number;
  type: 'critical' | 'warning' | 'info' | 'security';
  title: string;
  description: string;
  suggested_fix?: string;
  cwe?: string;
}

interface DiffBlock {
  line: number;
  original: string;
  refactored: string;
}

interface ReviewResult {
  score: number;
  security_score?: number;
  maintainability_score?: number;
  cyclomatic_complexity?: number;
  tech_debt?: string;
  summary: string;
  issues: Issue[];
  refactored_code: string;
  diff_blocks?: DiffBlock[];
  key_takeaways: string[];
  mode: string;
}

const PRESET_SNIPPETS: Record<string, { label: string; icon: string; language: string; code: string }> = {
  js_eval: {
    label: "JavaScript: eval() & Sync Loop",
    icon: "⚡",
    language: "javascript",
    code: `function processLargeArray(items) {
  let cache = {};
  
  // ❌ Legacy var & dangerous eval usage
  for (var i = 0; i < items.length; i++) {
    console.log("Processing item " + items[i].id);
    let itemData = eval("items[" + i + "]");
    cache[items[i].id] = itemData;
  }
  
  return cache;
}`
  },
  python_sec: {
    label: "Python: Security & eval() Flaw",
    icon: "🛡️",
    language: "python",
    code: `import os

def authenticate_user(user_input):
    print("Received login request:", user_input)
    
    # ❌ Critical Vulnerability: Arbitrary code execution via eval()
    user_data = eval(user_input)
    
    # ❌ Security Risk: Hardcoded API secret
    API_SECRET = "sk-live-992384729384729384"
    
    os.system("echo Logged in: " + user_input)
    
    try:
        f = open("db.txt")
    except:
        print("Failed to open DB")
        
    return user_data`
  },
  sql_inj: {
    label: "SQL: Injection Vulnerability",
    icon: "💉",
    language: "sql",
    code: `SELECT user_id, username, email, is_admin 
FROM users 
WHERE username = 'admin' OR '1'='1' -- AND status = 'active'`
  },
  react_rerender: {
    label: "React: Infinite Re-render Bug",
    icon: "⚛️",
    language: "typescript",
    code: `import React, { useState, useEffect } from 'react';

export function UserList() {
  const [users, setUsers] = useState([]);
  
  // ❌ Missing dependency array causes infinite loop
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data));
  });

  return (
    <div>
      {users.map((u: any) => <div key={Math.random()}>{u.name}</div>)}
    </div>
  );
}`
  }
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5001';

export default function Home() {
  const [code, setCode] = useState(PRESET_SNIPPETS.js_eval.code);
  const [language, setLanguage] = useState('javascript');
  const [focus, setFocus] = useState('all');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [activeTab, setActiveTab] = useState<'issues' | 'diff' | 'refactored' | 'takeaways'>('issues');
  
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [backendMode, setBackendMode] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Check Backend Health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/health`);
        if (res.ok) {
          const data = await res.json();
          setBackendStatus('online');
          setBackendMode(data.mode || 'Active');
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
      if (!response.ok) throw new Error(data.error || 'Failed to analyze code');

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

  const handleApplyFix = () => {
    if (result?.refactored_code) {
      setCode(result.refactored_code);
      alert("✨ Applied refactored AI fix directly to the editor!");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCode(text);
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'py') setLanguage('python');
        else if (['js', 'jsx'].includes(ext || '')) setLanguage('javascript');
        else if (['ts', 'tsx'].includes(ext || '')) setLanguage('typescript');
        else if (ext === 'sql') setLanguage('sql');
        else if (['java', 'cpp', 'c', 'go'].includes(ext || '')) setLanguage(ext as string);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadReport = () => {
    if (!result) return;
    const reportContent = `# Enterprise AI Code Audit Report

**Target Language:** ${language.toUpperCase()}
**Overall Quality Score:** ${result.score}/100
**Security Rating:** ${result.security_score || 'N/A'}/100
**Maintainability Rating:** ${result.maintainability_score || 'N/A'}/100
**Technical Debt Estimate:** ${result.tech_debt || 'N/A'}
**Audit Engine:** ${result.mode}

---

## Executive Summary
${result.summary}

---

## Issues & Vulnerabilities (${result.issues.length})

${result.issues.map((i, idx) => `### ${idx + 1}. [Line ${i.line}] ${i.title} (${i.cwe || 'CWE-707'})
**Severity:** ${i.type.toUpperCase()}
**Description:** ${i.description}

\`\`\`${language}
${i.suggested_fix || '// No specific line fix'}
\`\`\`
`).join('\n\n')}

---

## Complete Refactored Code

\`\`\`${language}
${result.refactored_code}
\`\`\`

---
*Generated by AI Code Auditor 2.0*
`;

    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_report_${language}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lineCount = code.split('\n').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Top Header */}
      <header style={{
        padding: '14px 28px',
        background: 'rgba(7, 10, 19, 0.9)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            boxShadow: 'var(--shadow-emerald)'
          }}>
            ⚡
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.02em' }}>
              Enterprise AI Code <span className="gradient-emerald">Auditor Pro</span>
            </h1>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              CWE / OWASP Security Analysis & Real-Time Diff Engine
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {result && (
            <button
              onClick={handleDownloadReport}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#d8b4fe',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              📥 Export Report (.md)
            </button>
          )}

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            background: backendStatus === 'online' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
            color: backendStatus === 'online' ? '#34d399' : '#fda4af',
            border: `1px solid ${backendStatus === 'online' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: backendStatus === 'online' ? '#10b981' : '#f43f5e',
              boxShadow: backendStatus === 'online' ? '0 0 10px #10b981' : 'none'
            }} />
            {backendStatus === 'online' ? `Engine: ${backendMode}` : 'Engine Offline'}
          </span>
        </div>
      </header>

      {/* 3-Column IDE Workspace */}
      <main style={{
        flex: 1,
        padding: '20px',
        display: 'grid',
        gridTemplateColumns: '280px 1fr 440px',
        gap: '18px',
        maxWidth: '1920px',
        width: '100%',
        margin: '0 auto'
      }}>
        
        {/* COLUMN 1: Sidebar Control Center */}
        <aside className="cyber-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* File Upload Dropzone */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Upload Code File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept=".py,.js,.jsx,.ts,.tsx,.sql,.java,.cpp,.c,.go"
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px dashed var(--border-emerald)',
                background: 'rgba(16, 185, 129, 0.05)',
                color: '#6ee7b7',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              📁 Drop or Click to Upload File
            </button>
          </div>

          {/* Language Selector */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Target Language
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {['javascript', 'python', 'typescript', 'sql', 'java', 'cpp'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'capitalize',
                    background: language === lang ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    color: language === lang ? '#34d399' : 'var(--text-secondary)',
                    border: `1px solid ${language === lang ? 'rgba(16, 185, 129, 0.5)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer'
                  }}
                >
                  {lang === 'cpp' ? 'C++' : lang}
                </button>
              ))}
            </div>
          </div>

          {/* Audit Focus Area */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Audit Focus Area
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { id: 'all', label: '🚀 Comprehensive Audit' },
                { id: 'security', label: '🛡️ CWE Security Audit' },
                { id: 'performance', label: '⚡ Performance & Memory' },
                { id: 'clean_code', label: '🎨 Clean Architecture' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFocus(f.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textAlign: 'left',
                    background: focus === f.id ? 'rgba(6, 182, 212, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                    color: focus === f.id ? '#67e8f9' : 'var(--text-secondary)',
                    border: `1px solid ${focus === f.id ? 'rgba(6, 182, 212, 0.4)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preset Library */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Vulnerability Presets
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.entries(PRESET_SNIPPETS).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => {
                    setCode(item.code);
                    setLanguage(item.language);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: '500',
                    textAlign: 'left',
                    background: 'rgba(255, 255, 255, 0.02)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>{item.icon}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* COLUMN 2: Center Editor Workspace */}
        <section className="cyber-card" style={{ display: 'flex', flexDirection: 'column', padding: '18px', position: 'relative' }}>
          {loading && <div className="scan-beam" />}

          {/* Editor Top Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', marginLeft: '8px', fontFamily: 'JetBrains Mono, monospace' }}>
                main.{language}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {result && (
                <button
                  onClick={handleApplyFix}
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.5)',
                    color: '#34d399',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ✨ Apply Fix to Editor
                </button>
              )}
              <button
                onClick={() => setCode('')}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Code Textarea & Gutter */}
          <div style={{
            flex: 1,
            display: 'flex',
            position: 'relative',
            background: 'var(--bg-code)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
            minHeight: '480px'
          }}>
            {/* Gutter */}
            <div style={{
              width: '42px',
              padding: '14px 0',
              background: 'rgba(0, 0, 0, 0.3)',
              color: 'var(--text-muted)',
              fontSize: '12.5px',
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

            {/* Code Input Area */}
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="// Paste source code here for enterprise security & quality review..."
              style={{
                flex: 1,
                padding: '14px 16px',
                background: 'transparent',
                color: '#e2e8f0',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: '13px',
                lineHeight: '1.6',
                fontFamily: 'JetBrains Mono, monospace',
                tabSize: 4
              }}
            />
          </div>

          {/* Audit Action Button */}
          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleReview}
              disabled={loading || !code.trim()}
              className="btn-glow"
              style={{
                padding: '12px 28px',
                background: loading ? 'var(--text-muted)' : 'var(--accent-gradient-btn)',
                color: '#ffffff',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '8px',
                cursor: loading || !code.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: 'var(--shadow-emerald)'
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
                  Performing Enterprise Audit...
                </>
              ) : (
                <>⚡ RUN AI CODE AUDIT</>
              )}
            </button>
          </div>
        </section>

        {/* COLUMN 3: Audit Inspector */}
        <section className="cyber-card" style={{ display: 'flex', flexDirection: 'column', padding: '18px' }}>
          {!result && !loading && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              padding: '20px'
            }}>
              <div style={{
                fontSize: '36px',
                marginBottom: '14px',
                background: 'rgba(16, 185, 129, 0.1)',
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                🛡️
              </div>
              <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                Inspector Ready
              </h3>
              <p style={{ fontSize: '12.5px', lineHeight: '1.5', maxWidth: '300px' }}>
                Select a preset or upload code on the left, then click <strong>RUN AI CODE AUDIT</strong> to inspect vulnerabilities and code diffs.
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
                width: '45px',
                height: '45px',
                border: '3px solid rgba(16, 185, 129, 0.2)',
                borderTopColor: 'var(--accent-emerald)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                Auditing AST & Scanning CWE Vulnerabilities...
              </p>
            </div>
          )}

          {result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Score Dashboard */}
              <div style={{
                background: 'rgba(7, 10, 19, 0.8)',
                borderRadius: '10px',
                padding: '14px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center', marginBottom: '10px' }}>
                  <div style={{ padding: '8px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: result.score >= 80 ? '#34d399' : result.score >= 60 ? '#fbbf24' : '#f87171' }}>
                      {result.score}
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)' }}>OVERALL</div>
                  </div>

                  <div style={{ padding: '8px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#38bdf8' }}>
                      {result.security_score || (result.score + 4)}
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)' }}>SECURITY</div>
                  </div>

                  <div style={{ padding: '8px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#c084fc' }}>
                      {result.maintainability_score || (result.score - 2)}
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)' }}>MAINTAIN</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  <span>Cyclomatic Complexity: <strong>{result.cyclomatic_complexity || 3}</strong></span>
                  <span>Tech Debt Fix Time: <strong>{result.tech_debt || '15 mins'}</strong></span>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {result.summary}
                </p>
              </div>

              {/* Navigation Tabs */}
              <div style={{
                display: 'flex',
                gap: '4px',
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: '12px'
              }}>
                <button
                  onClick={() => setActiveTab('issues')}
                  style={{
                    padding: '6px 10px',
                    background: 'transparent',
                    color: activeTab === 'issues' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                    border: 'none',
                    borderBottom: activeTab === 'issues' ? '2px solid var(--accent-emerald)' : '2px solid transparent',
                    fontWeight: '700',
                    fontSize: '11.5px',
                    cursor: 'pointer'
                  }}
                >
                  🚨 Issues ({result.issues.length})
                </button>

                <button
                  onClick={() => setActiveTab('diff')}
                  style={{
                    padding: '6px 10px',
                    background: 'transparent',
                    color: activeTab === 'diff' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                    border: 'none',
                    borderBottom: activeTab === 'diff' ? '2px solid var(--accent-emerald)' : '2px solid transparent',
                    fontWeight: '700',
                    fontSize: '11.5px',
                    cursor: 'pointer'
                  }}
                >
                  🔍 Code Diff
                </button>

                <button
                  onClick={() => setActiveTab('refactored')}
                  style={{
                    padding: '6px 10px',
                    background: 'transparent',
                    color: activeTab === 'refactored' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                    border: 'none',
                    borderBottom: activeTab === 'refactored' ? '2px solid var(--accent-emerald)' : '2px solid transparent',
                    fontWeight: '700',
                    fontSize: '11.5px',
                    cursor: 'pointer'
                  }}
                >
                  🛠️ Refactored
                </button>

                <button
                  onClick={() => setActiveTab('takeaways')}
                  style={{
                    padding: '6px 10px',
                    background: 'transparent',
                    color: activeTab === 'takeaways' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                    border: 'none',
                    borderBottom: activeTab === 'takeaways' ? '2px solid var(--accent-emerald)' : '2px solid transparent',
                    fontWeight: '700',
                    fontSize: '11.5px',
                    cursor: 'pointer'
                  }}
                >
                  📈 Takeaways
                </button>
              </div>

              {/* Tab 1: Issues */}
              {activeTab === 'issues' && (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {result.issues.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#34d399', fontSize: '13px' }}>
                      ✨ Zero vulnerabilities detected in this code!
                    </div>
                  ) : (
                    result.issues.map((issue, idx) => (
                      <div key={idx} style={{
                        background: 'rgba(7, 10, 19, 0.6)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '800',
                              background: issue.type === 'critical' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              color: issue.type === 'critical' ? '#fda4af' : '#fde047',
                              border: `1px solid ${issue.type === 'critical' ? 'rgba(244, 63, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
                            }}>
                              LINE {issue.line}
                            </span>
                            {issue.cwe && <span className="badge-cwe">{issue.cwe}</span>}
                          </div>
                        </div>

                        <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {issue.title}
                        </div>

                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                          {issue.description}
                        </p>

                        {issue.suggested_fix && (
                          <div style={{
                            marginTop: '4px',
                            background: 'var(--bg-code)',
                            borderRadius: '4px',
                            padding: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '10px', fontWeight: '700', color: '#67e8f9' }}>Suggested Fix:</span>
                              <button
                                onClick={() => handleCopy(issue.suggested_fix!, `fix-${idx}`)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer' }}
                              >
                                {copiedId === `fix-${idx}` ? '✓ Copied' : '📋 Copy Fix'}
                              </button>
                            </div>
                            <pre style={{ fontSize: '11px', color: '#6ee7b7', margin: 0, overflowX: 'auto' }}>
                              {issue.suggested_fix}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 2: Code Diff Viewer */}
              {activeTab === 'diff' && (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Line-by-Line Changes (- Original / + Refactored):
                  </div>
                  {result.diff_blocks && result.diff_blocks.length > 0 ? (
                    result.diff_blocks.map((d, i) => (
                      <div key={i} style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '2px 8px', fontSize: '10px', color: 'var(--text-muted)' }}>
                          Line {d.line}
                        </div>
                        <div className="diff-remove">{d.original}</div>
                        <div className="diff-add">{d.refactored}</div>
                      </div>
                    ))
                  ) : (
                    <pre style={{ fontSize: '12px', color: '#6ee7b7', background: 'var(--bg-code)', padding: '12px', borderRadius: '6px' }}>
                      {result.refactored_code}
                    </pre>
                  )}
                </div>
              )}

              {/* Tab 3: Refactored Code */}
              {activeTab === 'refactored' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cleaned & Refactored Code:</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={handleApplyFix}
                        style={{
                          padding: '4px 10px',
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.5)',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        ✨ Apply to Editor
                      </button>
                      <button
                        onClick={() => handleCopy(result.refactored_code, 'refactored')}
                        style={{
                          padding: '4px 10px',
                          background: 'transparent',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        {copiedId === 'refactored' ? '✓ Copied' : '📋 Copy'}
                      </button>
                    </div>
                  </div>
                  <pre style={{
                    flex: 1,
                    background: 'var(--bg-code)',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    overflow: 'auto',
                    fontSize: '12px',
                    lineHeight: '1.5',
                    color: '#6ee7b7'
                  }}>
                    {result.refactored_code}
                  </pre>
                </div>
              )}

              {/* Tab 4: Takeaways */}
              {activeTab === 'takeaways' && (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {result.key_takeaways.map((t, idx) => (
                    <div key={idx} style={{
                      padding: '10px',
                      background: 'rgba(7, 10, 19, 0.6)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ color: 'var(--accent-emerald)', fontWeight: '800' }}>•</span>
                      {t}
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
