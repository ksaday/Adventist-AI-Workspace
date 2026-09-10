import { NextResponse } from 'next/server';

/**
 * Readiness probe endpoint (/readyz).
 * Confirms system readiness. Does not leak sensitive environment details.
 */
export async function GET(): Promise<NextResponse> {
  // In Phase 0, confirms application process is ready to serve requests.
  return new NextResponse('READY', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
