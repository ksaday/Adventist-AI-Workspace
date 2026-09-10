import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'SDA AI Workspace',
  description: 'Citation-integrity workbench for Seventh-day Adventist members and pastors.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
