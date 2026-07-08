import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/useAuth';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const router = useRouter();
  const { user, loading } = useAuth();

  // If Supabase just processed an email-confirmation link (the #access_token=...
  // hash), a session appears here shortly after page load. Once it does, leave.
  useEffect(() => {
    if (!loading && user) router.push('/');
  }, [loading, user]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push('/');
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setInfo('Check your email to confirm your account, then log in.');
    }
  }

  return (
    <div style={{ maxWidth: '360px', margin: '80px auto', padding: '24px', background: '#FCFBF8', borderRadius: '8px', border: '1px solid #D4CFC4' }}>
      <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{mode === 'login' ? 'Log in' : 'Sign up'}</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #D4CFC4', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Password</label>
          <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #D4CFC4', borderRadius: '4px' }} />
        </div>
        {error && <div style={{ color: '#A33B2C', fontSize: '13px', marginBottom: '8px' }}>{error}</div>}
        {info && <div style={{ color: '#4A5D52', fontSize: '13px', marginBottom: '8px' }}>{info}</div>}
        <button type="submit" style={{ width: '100%', padding: '10px', background: '#1C1B19', color: '#fff', border: 'none', borderRadius: '4px' }}>
          {mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
      </form>
      <div style={{ marginTop: '12px', fontSize: '13px', textAlign: 'center' }}>
        {mode === 'login' ? (
          <span>No account? <a href="#" onClick={() => setMode('signup')}>Sign up</a></span>
        ) : (
          <span>Have an account? <a href="#" onClick={() => setMode('login')}>Log in</a></span>
        )}
      </div>
    </div>
  );
}
