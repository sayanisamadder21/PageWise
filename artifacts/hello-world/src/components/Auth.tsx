import { supabase } from '../supabase';

export default function Auth() {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  };

  const handleEmailLogin = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };

  const handleEmailSignup = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert('Check your email to confirm signup!');
  };

  return (
    <div>
      <button onClick={handleGoogleLogin}>Continue with Google</button>
    </div>
  );
}