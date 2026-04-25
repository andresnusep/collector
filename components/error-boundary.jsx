// React error boundary. Wraps the whole app at the index.html mount point so
// a single thrown error in any component shows a friendly retry UI instead of
// a blank page. Class component because hooks can't trap render errors.

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // Surface to the console so the user can copy-paste a stack into a bug
    // report. We don't ship a remote error sink yet — that's a Bucket-4 item.
    console.error('[ErrorBoundary]', error, info && info.componentStack);
  }
  reset = () => {
    this.setState({ error: null });
  };
  reload = () => {
    try { window.location.reload(); } catch {}
  };
  render() {
    if (!this.state.error) return this.props.children;
    const msg = String(this.state.error && this.state.error.message || this.state.error);
    return (
      <div style={{
        minHeight: '100vh', width: '100vw', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 24,
        background: '#0E0C0A', color: '#F4EFE6',
        fontFamily: 'Space Grotesk, -apple-system, system-ui, sans-serif',
      }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 2,
            textTransform: 'uppercase', color: 'rgba(244,239,230,0.55)', marginBottom: 14,
          }}>Something went wrong</div>
          <div style={{
            fontSize: 28, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.15,
            marginBottom: 14,
          }}>The app hit an unexpected error.</div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            color: 'rgba(244,239,230,0.55)', wordBreak: 'break-word',
            padding: '10px 12px', borderRadius: 6,
            background: 'rgba(244,239,230,0.05)',
            border: '1px solid rgba(244,239,230,0.1)',
            marginBottom: 18,
          }}>{msg}</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={this.reset} style={btnSecondary}>Try again</button>
            <button onClick={this.reload} style={btnPrimary}>Reload app</button>
          </div>
        </div>
      </div>
    );
  }
}

const btnPrimary = {
  padding: '10px 18px', borderRadius: 6, border: 'none',
  background: '#E8FF4A', color: '#0E0C0A',
  fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
  letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
};
const btnSecondary = {
  padding: '10px 18px', borderRadius: 6, color: '#F4EFE6',
  background: 'transparent', border: '1px solid rgba(244,239,230,0.2)',
  fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
  letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
};

window.ErrorBoundary = ErrorBoundary;
