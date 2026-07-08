import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/useAuth';
import HealthTrackerPersonal from '../components/TrackerApp';
import ChatWidget from '../components/ChatWidget';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user]);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading || !user) {
    return <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Georgia, serif' }}>Loading…</div>;
  }

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', padding: '8px 4px', fontSize: '13px', color: '#5B574E' }}>
        <span>{user.email}</span>
        <button onClick={logout} style={{ background: 'none', border: '1px solid #D4CFC4', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>Log out</button>
      </div>
      <HealthTrackerPersonal />
      <ChatWidget />
    </div>
  );
}
