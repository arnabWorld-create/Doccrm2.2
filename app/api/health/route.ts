import { NextResponse } from 'next/server';

// Lightweight health check — no DB, no auth.
// Used by Vercel cron to keep the serverless function warm.
export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}
