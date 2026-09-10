import { NextResponse } from 'next/server';

/**
 * Liveness probe endpoint (/healthz).
 * Returns 200 OK without disclosing internal versions or calling external services.
 */
export async function GET(): Promise<NextResponse> {
  return new NextResponse('OK', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
