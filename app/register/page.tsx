'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [declaredRole, setDeclaredRole] = useState<'member' | 'pastor' | 'teacher' | 'other'>('member');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, declaredRole, inviteCode }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Registration could not be completed with the details provided.');
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
      <h1 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Join the closed beta</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label>
          Invitation code
          <input
            required
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </label>
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
          Password (10+ characters)
          <input
            type="password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </label>
        <label>
          I am a
          <select
            value={declaredRole}
            onChange={(e) => setDeclaredRole(e.target.value as typeof declaredRole)}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          >
            <option value="member">Member</option>
            <option value="pastor">Pastor</option>
            <option value="teacher">Teacher / Bible worker</option>
            <option value="other">Other</option>
          </select>
        </label>
        {error && (
          <div role="alert" style={{ color: '#dc2626', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}
        <button type="submit" disabled={submitting} style={{ padding: '0.6rem', fontWeight: 600 }}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p style={{ fontSize: '0.85rem', marginTop: '1rem' }}>
        Already have an account? <a href="/login">Sign in</a>.
      </p>
    </div>
  );
}
