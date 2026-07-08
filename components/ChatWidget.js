import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: userMsg.content, history: messages }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages(m => [...m, { role: 'assistant', content: `Error: ${data.error}` }]);
      } else {
        setMessages(m => [...m, { role: 'assistant', content: data.reply }]);
      }
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: 'Network error, try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        position: 'fixed', bottom: '20px', right: '20px', borderRadius: '50%',
        width: '56px', height: '56px', background: '#4A5D52', color: '#fff',
        border: 'none', fontSize: '22px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>💬</button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: '20px', right: '20px', width: '340px', height: '460px',
      background: '#FCFBF8', border: '1px solid #D4CFC4', borderRadius: '8px',
      display: 'flex', flexDirection: 'column', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #D4CFC4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Nutrition assistant</strong>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: '16px' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
        {messages.length === 0 && (
          <div style={{ fontSize: '13px', color: '#5B574E' }}>Ask about your macros, whether you're on track, or general nutrition questions. Answers use your own logged data.</div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            marginBottom: '8px', textAlign: m.role === 'user' ? 'right' : 'left',
          }}>
            <span style={{
              display: 'inline-block', padding: '6px 10px', borderRadius: '10px', fontSize: '13px', maxWidth: '85%',
              background: m.role === 'user' ? '#DFE6E1' : '#E4D9C8', textAlign: 'left',
            }}>{m.content}</span>
          </div>
        ))}
        {loading && <div style={{ fontSize: '12px', color: '#5B574E' }}>Thinking…</div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid #D4CFC4' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask something…"
          style={{ flex: 1, border: 'none', padding: '10px', fontSize: '13px', background: 'transparent' }}
        />
        <button onClick={send} disabled={loading} style={{ border: 'none', background: 'none', padding: '0 12px', color: '#4A5D52', fontWeight: 600 }}>Send</button>
      </div>
    </div>
  );
}
