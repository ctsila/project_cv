import { NextResponse } from 'next/server';
import { oauthStatus } from '@/lib/oauth-providers';

export async function GET() {
  return NextResponse.json(oauthStatus());
}
