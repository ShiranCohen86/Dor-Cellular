import { useState, useRef, useEffect } from 'react';
import { streamChat, deployChanges } from '../api/ai.api.js';

const TOOL_LABELS = {
  read_file: '📖 קריאת קובץ',
  write_file: '✏️ כתיבת קובץ',
  list_directory: '📂 תיקייה',
  run_command: '⚡ פקודה',
};

function ToolCallPill({ event }) {
  const label = TOOL_LABELS[event.name] || event.name;
  const detail = event.input?.path || event.input?.command || '';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderRadius: 6, padding: '3px 10px', fontSize: 12, color: 'var(--text-muted)',
      margin: '3px 0',
    }}>
      <span>{label}</span>
      {detail && <code style={{ fontSize: 11, opacity: 0.75 }}>{detail}</code>}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      <div style={{
        maxWidth: '80%',
        background: isUser ? 'var(--brand-primary)' : 'var(--surface-2)',
        color: isUser ? '#fff' : 'inherit',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        padding: '10px 14px',
        fontSize: 14,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.content}
      </div>
    </div>
  );
}

function AssistantTurn({ turn }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {turn.toolCalls.map((tc, i) => (
        <div key={i} style={{ marginBottom: 4 }}>
          <ToolCallPill event={tc} />
        </div>
      ))}
      {turn.changedFiles.map((f, i) => (
        <div key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#d1fae5', border: '1px solid #6ee7b7',
          borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#065f46',
          margin: '2px 0 2px 4px',
        }}>
          ✅ {f}
        </div>
      ))}
      {turn.text && (
        <div style={{
          maxWidth: '80%',
          background: 'var(--surface-2)',
          borderRadius: '18px 18px 18px 4px',
          padding: '10px 14px',
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          marginTop: turn.toolCalls.length > 0 || turn.changedFiles.length > 0 ? 6 : 0,
        }}>
          {turn.text}
        </div>
      )}
    </div>
  );
}

function DeployPanel({ changedFiles, onClose }) {
  const [status, setStatus] = useState('idle'); // idle | running | done | error
  const [results, setResults] = useState([]);
  const [commitMsg, setCommitMsg] = useState('');

  const handleDeploy = async () => {
    if (!commitMsg.trim()) return;
    setStatus('running');
    try {
      const data = await deployChanges(commitMsg.trim());
      setResults(data.results);
      setStatus(data.ok ? 'done' : 'error');
    } catch (err) {
      setResults([{ cmd: 'deploy', output: err.message, ok: false }]);
      setStatus('error');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
    }} onClick={onClose}>
      <div
        className="card"
        style={{ width: 520, maxHeight: '80vh', overflowY: 'auto', padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <strong style={{ fontSize: 16 }}>🚀 Deploy לשרת</strong>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '2px 8px' }}>✕</button>
        </div>

        {changedFiles.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>קבצים שהשתנו:</div>
            {changedFiles.map((f, i) => (
              <div key={i} style={{ fontSize: 13, fontFamily: 'monospace', padding: '2px 0' }}>• {f}</div>
            ))}
          </div>
        )}

        <input
          placeholder="הודעת commit (לדוגמה: הוספת עמוד דוחות)"
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
          style={{ width: '100%', marginBottom: 12 }}
          disabled={status === 'running'}
          onKeyDown={(e) => e.key === 'Enter' && handleDeploy()}
        />

        {status === 'idle' && (
          <button onClick={handleDeploy} disabled={!commitMsg.trim()} style={{ width: '100%' }}>
            git add → commit → push
          </button>
        )}
        {status === 'running' && (
          <div className="muted" style={{ textAlign: 'center', padding: 12 }}>מריץ…</div>
        )}

        {results.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((r, i) => (
              <div key={i} style={{
                background: r.ok ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${r.ok ? '#86efac' : '#fca5a5'}`,
                borderRadius: 6, padding: 10,
              }}>
                <code style={{ fontSize: 12, display: 'block', marginBottom: 4, color: r.ok ? '#166534' : '#991b1b' }}>
                  {r.ok ? '✓' : '✗'} {r.cmd}
                </code>
                {r.output && (
                  <pre style={{ margin: 0, fontSize: 11, whiteSpace: 'pre-wrap', color: r.ok ? '#15803d' : '#b91c1c' }}>
                    {r.output}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}

        {status === 'done' && (
          <div style={{ marginTop: 12, color: '#16a34a', textAlign: 'center', fontWeight: 600 }}>
            ✅ Deploy הצליח!
          </div>
        )}
        {status === 'error' && (
          <div style={{ marginTop: 12, color: '#dc2626', textAlign: 'center', fontWeight: 600 }}>
            ❌ Deploy נכשל — ראה פירוט למעלה
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIAssistant() {
  const [history, setHistory] = useState([]); // { role, content }
  const [turns, setTurns] = useState([]);    // assistant turns with tool calls
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [allChangedFiles, setAllChangedFiles] = useState([]);
  const [showDeploy, setShowDeploy] = useState(false);
  const [error, setError] = useState(null);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, turns, streaming]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const newUserMessage = { role: 'user', content: text };
    const updatedHistory = [...history, newUserMessage];

    setHistory(updatedHistory);
    setInput('');
    setError(null);
    setStreaming(true);

    // Current assistant turn being built
    const currentTurn = { text: '', toolCalls: [], changedFiles: [] };
    setTurns((prev) => [...prev, currentTurn]);

    const turnIndex = turns.length;

    try {
      await streamChat(updatedHistory, (event) => {
        if (event.type === 'text') {
          setTurns((prev) => {
            const updated = [...prev];
            updated[turnIndex] = { ...updated[turnIndex], text: updated[turnIndex].text + event.content };
            return updated;
          });
        } else if (event.type === 'tool_start') {
          setTurns((prev) => {
            const updated = [...prev];
            updated[turnIndex] = {
              ...updated[turnIndex],
              toolCalls: [...updated[turnIndex].toolCalls, event],
            };
            return updated;
          });
        } else if (event.type === 'file_changed') {
          setTurns((prev) => {
            const updated = [...prev];
            updated[turnIndex] = {
              ...updated[turnIndex],
              changedFiles: [...updated[turnIndex].changedFiles, event.path],
            };
            return updated;
          });
          setAllChangedFiles((prev) => {
            if (prev.includes(event.path)) return prev;
            return [...prev, event.path];
          });
        } else if (event.type === 'done') {
          // Final assistant reply goes into history for next turn
          setTurns((prev) => {
            const finalText = prev[turnIndex]?.text || '';
            if (finalText) {
              setHistory((h) => [...h, { role: 'assistant', content: finalText }]);
            }
            return prev;
          });
        } else if (event.type === 'error') {
          setError(event.message);
        }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Build combined display list: interleave user messages and assistant turns
  const displayItems = [];
  let turnIdx = 0;
  for (const msg of history) {
    if (msg.role === 'user') {
      displayItems.push({ kind: 'user', msg });
    } else if (msg.role === 'assistant') {
      const turn = turns[turnIdx];
      if (turn) {
        displayItems.push({ kind: 'assistant', turn });
        turnIdx++;
      }
    }
  }
  // If we're currently streaming, add the in-progress turn
  if (streaming && turns.length > 0) {
    const inProgress = turns[turns.length - 1];
    displayItems.push({ kind: 'assistant', turn: inProgress });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', position: 'relative' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface-1)',
      }}>
        <div>
          <strong style={{ fontSize: 16 }}>🤖 עוזר AI</strong>
          <span className="muted" style={{ fontSize: 13, marginInlineStart: 10 }}>
            כתוב הוראות ואני אשנה קבצים בפרויקט
          </span>
        </div>
        {allChangedFiles.length > 0 && (
          <button onClick={() => setShowDeploy(true)} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '7px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            🚀 Deploy ({allChangedFiles.length})
          </button>
        )}
      </div>

      {/* Message list */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {displayItems.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 80, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>שלום! אני עוזר ה-AI של דור הסלולר</div>
            <div style={{ fontSize: 14 }}>כתוב לי מה לשנות באפליקציה ואני אטפל בזה</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 20 }}>
              לדוגמה: "הוסף עמודת מספר ת.ז. לטבלת לקוחות"
            </div>
          </div>
        )}

        {displayItems.map((item, i) => (
          item.kind === 'user'
            ? <MessageBubble key={i} msg={item.msg} />
            : <AssistantTurn key={i} turn={item.turn} />
        ))}

        {streaming && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
            <span>חושב…</span>
          </div>
        )}

        {error && (
          <div className="card" style={{ borderInlineStart: '4px solid var(--danger)', padding: '10px 14px', marginTop: 8, fontSize: 13 }}>
            <strong>שגיאה:</strong> {error}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface-1)',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-end',
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="כתוב הוראה... (Enter לשליחה, Shift+Enter לשורה חדשה)"
          disabled={streaming}
          rows={2}
          style={{
            flex: 1,
            resize: 'none',
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
            fontSize: 14,
            fontFamily: 'inherit',
            lineHeight: 1.5,
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || streaming}
          style={{ padding: '10px 20px', borderRadius: 10, height: 44 }}
        >
          שלח
        </button>
      </div>

      {showDeploy && (
        <DeployPanel changedFiles={allChangedFiles} onClose={() => setShowDeploy(false)} />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
