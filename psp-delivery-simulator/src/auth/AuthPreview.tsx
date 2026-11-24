import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { createPspAuthClient } from './supabaseAuthClient';
import { CloudReleasesPreview } from './CloudReleasesPreview';
import { CloudWorkspaceApp } from './CloudWorkspaceApp';

const inputStyle = { width: '100%', boxSizing: 'border-box' as const, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, font: 'inherit' };
const buttonStyle = { padding: '10px 16px', border: 0, borderRadius: 8, background: '#2767cf', color: 'white', cursor: 'pointer', fontWeight: 600 as const };

/** Authenticated PSP cloud workspace; optional diagnostic preview in development. */
export function AuthPreview({ fullWorkspace = false }: { fullWorkspace?: boolean }) {
  const { client, configurationError } = useMemo(() => {
    try { return { client: createPspAuthClient(), configurationError: null }; }
    catch (error) { return { client: null, configurationError: error instanceof Error ? error.message : 'Cannot configure Supabase.' }; }
  }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) { setInitializing(false); return; }
    let active = true;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null);
    });
    void client.auth.getSession().then(({ data, error: readError }) => {
      if (active) {
        setUser(data.session?.user ?? null);
        setError(readError?.message ?? null);
        setInitializing(false);
      }
    }).catch((caught: unknown) => {
      if (active) { setError(caught instanceof Error ? caught.message : 'Unable to check session.'); setInitializing(false); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [client]);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client || pending) return;
    setPending(true); setError(null);
    try {
      const result = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      setUser(result.data.user);
      setPassword('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign in failed.');
    } finally { setPending(false); }
  };

  const signOut = async () => {
    if (!client || pending) return;
    setPending(true); setError(null);
    try {
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError) throw signOutError;
      setUser(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Sign out failed.'); }
    finally { setPending(false); }
  };

  return <main style={{ maxWidth: fullWorkspace ? 1180 : 520, margin: '48px auto', padding: '28px 24px', background: '#fff', border: '1px solid #e0e6ef', borderRadius: 12, fontFamily: 'system-ui, sans-serif', color: '#18273d' }}>
    <h1 style={{ marginTop: 0 }}>{fullWorkspace ? "PSP — Delivery Simulator" : "PSP — Authentication Preview"}</h1>
    <p style={{ fontSize: 14, color: '#52627a', lineHeight: 1.6 }}>Your releases are stored securely in your PSP account. Previously created local-only releases are separate and are not automatically imported.</p>
    {configurationError ? <p role="alert" style={{ color: '#b42318' }}>{configurationError}</p> : initializing ? <p role="status">Checking Supabase session…</p> : user ? <section>
      <p role="status">Signed in as <strong>{user.email ?? 'authenticated user'}</strong></p>
      <button type="button" style={buttonStyle} disabled={pending} onClick={() => void signOut()}>{pending ? 'Signing out…' : 'Sign out'}</button>
      {client && (fullWorkspace ? <CloudWorkspaceApp key={user.id} client={client} userId={user.id} /> : <CloudReleasesPreview key={user.id} client={client} userId={user.id} />)}
    </section> : <form onSubmit={(event) => void signIn(event)} style={{ display: 'grid', gap: 16 }}>
      <label style={{ display: 'grid', gap: 6 }}>Email<input style={inputStyle} type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)}/></label>
      <label style={{ display: 'grid', gap: 6 }}>Password<input style={inputStyle} type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)}/></label>
      <button type="submit" style={buttonStyle} disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>}
    {error && <p role="alert" style={{ color: '#b42318' }}>{error}</p>}
    {import.meta.env.DEV && <p style={{ fontSize: 13, marginTop: 24 }}><a href="/?local-workspace=1">Open local development workspace</a></p>}
  </main>;
}
