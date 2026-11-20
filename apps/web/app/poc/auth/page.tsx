'use client';

// D7 PROOF OF CONCEPT: a bare page to exercise web sessions (L3). Not product UI.
import { useState } from 'react';
import { authClient, PUBLIC_API_URL } from '../../../lib/auth-client';

export default function AuthTrialPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('Signed out');

  const whoAmI = async () => {
    const response = await fetch(`${PUBLIC_API_URL}/v1/me`, { credentials: 'include' });
    setStatus(
      response.ok
        ? `Signed in as ${(await response.json()).email}`
        : `Not signed in (${response.status})`,
    );
  };

  return (
    <main>
      <h1>Authentication trial</h1>
      <p>Proof of concept only: test accounts, no real data.</p>
      <label>
        Email{' '}
        <input
          aria-label="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label>
        Password{' '}
        <input
          aria-label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <button
        type="button"
        onClick={async () => {
          const { error } = await authClient.signIn.email({ email, password });
          setStatus(error ? `Sign-in failed: ${error.code ?? error.status}` : 'Signed in');
        }}
      >
        Sign in
      </button>
      <button type="button" onClick={whoAmI}>
        Who am I
      </button>
      <button
        type="button"
        onClick={async () => {
          await authClient.signOut();
          setStatus('Signed out');
        }}
      >
        Sign out
      </button>
      <p role="status">{status}</p>
      <p data-testid="script-cookies">{typeof document === 'undefined' ? '' : document.cookie}</p>
    </main>
  );
}
