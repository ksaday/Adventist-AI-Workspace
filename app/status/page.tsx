'use client';

import React, { useState, useEffect } from 'react';
import { getSystemStatusReport, type SystemStatusReport } from '../../server/monitoring/status.js';

export default function StatusPage() {
  const [report, setReport] = useState<SystemStatusReport | null>(null);

  useEffect(() => {
    getSystemStatusReport().then(setReport);
  }, []);

  if (!report) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
        <h2>Loading system status...</h2>
      </div>
    );
  }

  const statusColor =
    report.overall === 'operational'
      ? '#059669' // Emerald
      : report.overall === 'degraded'
      ? '#d97706' // Amber
      : '#dc2626'; // Red

  return (
    <div
      style={{
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        maxWidth: '800px',
        margin: '0 auto',
        color: 'var(--text-primary, #1e293b)',
      }}
    >
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
          SDA AI Workspace — System Status
        </h1>
        <p style={{ margin: 0, color: '#64748b' }}>
          Live operational status, uptime metrics, and public architectural integrity guarantees.
        </p>
      </header>

      {/* Overall Banner */}
      <div
        data-testid="overall-status-banner"
        style={{
          padding: '1.25rem',
          backgroundColor: report.overall === 'operational' ? '#ecfdf5' : '#fffbeb',
          border: `1px solid ${statusColor}`,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: statusColor,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: statusColor }}>
            {report.overall === 'operational'
              ? 'All Systems Operational'
              : report.overall === 'maintenance'
              ? 'Scheduled Maintenance in Progress'
              : 'System Degraded'}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#475569' }}>
            Uptime (past 30 days): {report.uptimePercentage}% · Target SLA: {report.slaTarget}%
          </div>
        </div>
      </div>

      {/* Components Grid */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem' }}>Component Health</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {report.components.map(comp => (
            <div
              key={comp.id}
              data-testid={`component-${comp.id}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.875rem 1rem',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{comp.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{comp.message}</div>
              </div>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: comp.status === 'operational' ? '#059669' : '#dc2626',
                  textTransform: 'uppercase',
                }}
              >
                {comp.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Architectural Invariants / Guarantees */}
      <section
        style={{
          marginBottom: '2.5rem',
          padding: '1.5rem',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
        }}
      >
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: '0 0 1rem 0' }}>
          Public Invariant Guarantees
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
            <span style={{ color: '#059669', fontWeight: 700 }}>✔</span>
            <div>
              <strong>$0.00 AI Spend Guarantee:</strong> The server never calls an external AI model.
              Zero application-owned tokens incurred.
            </div>
          </li>
          <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
            <span style={{ color: '#059669', fontWeight: 700 }}>✔</span>
            <div>
              <strong>No EGW Corpus Storage:</strong> We do not collect, ingest, host, index, or hold Ellen G. White text as a source.
              Member-supplied source text is browser-only and never reaches our server.
            </div>
          </li>
          <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
            <span style={{ color: '#059669', fontWeight: 700 }}>✔</span>
            <div>
              <strong>Strict Evidence Floor:</strong> Only Level E4 (confirmed by you at an official source) may render in green as VERIFIED.
            </div>
          </li>
        </ul>
      </section>

      {/* Independence Disclaimer Banner */}
      <footer
        data-testid="status-independence-disclaimer"
        style={{
          padding: '1rem',
          borderTop: '1px solid #e2e8f0',
          fontSize: '0.8rem',
          color: '#64748b',
          textAlign: 'center',
          lineHeight: '1.5',
        }}
      >
        SDA AI Workspace is an independent project and is not officially affiliated with, sponsored by, or endorsed by the General Conference of Seventh-day Adventists or the Ellen G. White Estate, Inc.
      </footer>
    </div>
  );
}
