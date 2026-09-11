'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Incorrect email or password.');
        return;
      }
      router.push('/');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '4rem auto', padding: '0 1rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>SDA AI Workspace</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </label>
        {error && (
          <div role="alert" style={{ color: '#dc2626', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}
        <button type="submit" disabled={submitting} style={{ padding: '0.6rem', fontWeight: 600 }}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p style={{ fontSize: '0.85rem', marginTop: '1rem' }}>
        Invited to the closed beta? <a href="/register">Create an account</a>.
      </p>
    </div>
  );
}
