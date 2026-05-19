import { NextRequest, NextResponse } from 'next/server';
import { renderDocxBuffer, renderPdfBuffer } from '@/lib/exporters';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const limit = rateLimit(`export:${getClientIp(req)}`, 20);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many export requests.' }, { status: 429 });
  const { title, content, format } = await req.json();
  if (!content || !['pdf', 'docx', 'txt'].includes(format)) return NextResponse.json({ error: 'Content and supported format are required.' }, { status: 400 });
  if (format === 'txt') return new NextResponse(content, { headers: { 'content-type': 'text/plain; charset=utf-8', 'content-disposition': `attachment; filename="${title || 'export'}.txt"` } });
  const buffer = format === 'pdf' ? await renderPdfBuffer(title, content) : await renderDocxBuffer(title, content);
  const body = new Uint8Array(buffer);
  return new NextResponse(body, { headers: { 'content-type': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'content-disposition': `attachment; filename="${title || 'export'}.${format}"` } });
}
