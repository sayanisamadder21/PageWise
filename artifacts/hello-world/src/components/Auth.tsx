import { supabase } from '../supabase';

export default function Auth() {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFF4E5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'inherit'
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #D9C7A8',
        borderRadius: '16px',
        padding: '48px 40px',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(26,21,15,0.08)'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
        <h1 style={{
          color: '#1A150F',
          fontSize: '24px',
          fontWeight: '700',
          margin: '0 0 8px'
        }}>PageWise</h1>
        <p style={{
          color: '#6B4F2A',
          fontSize: '14px',
          margin: '0 0 32px'
        }}>Every document has a story.</p>

        <button onClick={handleGoogleLogin} style={{
          width: '100%',
          padding: '14px',
          background: '#FF8A00',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '10px',
          fontSize: '15px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}>
          <span>G</span> Continue with Google
        </button>

        <p style={{
          color: '#D9C7A8',
          fontSize: '12px',
          marginTop: '24px'
        }}>By continuing, you agree to our Terms & Privacy Policy</p>
      </div>
    </div>
  );
}