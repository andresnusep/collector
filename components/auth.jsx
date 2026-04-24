// Supabase auth — sign-in gate with email + Google.

const SUPABASE_URL = 'https://iqnqwweukbcjgyspqbyg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbnF3d2V1a2Jjamd5c3BxYnlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTk2OTUsImV4cCI6MjA5MjI5NTY5NX0.pMXw1RAOF-PPQ-6iMW22gfIQiIPJfFtnYozrkyJ-2QQ';
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

function useSession() {
  const [session, setSession] = React.useState(undefined); // undefined = loading, null = signed out
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return session;
}

function SignInScreen({ tweaks }) {
  const [mode, setMode] = React.useState('signin'); // signin | signup
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState('');

  const handleEmail = async (e) => {
    e.preventDefault();
    setError(''); setMessage(''); setBusy(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Account created. Check your email to confirm, then sign in.');
        setMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(''); setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname },
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || String(err));
      setBusy(false);
    }
  };

  return (
    <div className={`app ${tweaks?.theme || 'dark'}`} style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', color: 'var(--fg)', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1.2, lineHeight: 1 }}>
            Kollector<br /><span style={{ color: 'var(--accent)' }}>Studio.</span>
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
            textTransform: 'uppercase', color: 'var(--dim)', marginTop: 10,
          }}>For vinyl DJs</div>
        </div>

        <button onClick={handleGoogle} disabled={busy} style={{
          width: '100%', padding: 12, borderRadius: 8, marginBottom: 14,
          background: 'var(--fg)', color: 'var(--bg)', border: 'none',
          fontSize: 13, fontWeight: 700, letterSpacing: 0.3, cursor: busy ? 'default' : 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 10,
        }}>
          <svg width="16" height="16" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
          color: 'var(--dim)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          or
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <form onSubmit={handleEmail}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            required placeholder="Email"
            style={authInputStyle} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            required minLength={6} placeholder="Password"
            style={authInputStyle} />
          <button type="submit" disabled={busy} style={{
            padding: 12, borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: 'var(--on-accent)',
            fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
            textTransform: 'uppercase', cursor: busy ? 'default' : 'pointer',
            fontFamily: 'inherit', opacity: busy ? 0.6 : 1,
          }}>{busy ? '…' : (mode === 'signup' ? 'Create account' : 'Sign in')}</button>
        </form>

        {error && (
          <div style={{
            marginTop: 12, padding: 10, borderRadius: 6, fontSize: 12,
            background: 'rgba(255, 74, 74, 0.1)', border: '1px solid rgba(255, 74, 74, 0.3)',
            color: '#FF4A4A',
          }}>{error}</div>
        )}
        {message && (
          <div style={{
            marginTop: 12, padding: 10, borderRadius: 6, fontSize: 12,
            background: 'var(--hover)', border: '1px solid var(--border)',
            color: 'var(--fg)',
          }}>{message}</div>
        )}

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: 'var(--dim)' }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); setMessage(''); }}
            style={{
              background: 'transparent', border: 'none', color: 'var(--accent)',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
              padding: 0, textDecoration: 'underline',
            }}>{mode === 'signin' ? 'Sign up' : 'Sign in'}</button>
        </div>
      </div>
    </div>
  );
}

const authInputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  background: 'var(--hover)', border: '1px solid var(--border)',
  color: 'var(--fg)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
};

async function signOut() {
  await supabase.auth.signOut();
}

Object.assign(window, { supabaseClient: supabase, useSession, SignInScreen, signOut });
