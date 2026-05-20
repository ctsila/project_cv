import { NextRequest, NextResponse } from 'next/server';
import { renderDocxBuffer, renderPdfBuffer } from '@/lib/exporters';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

function buildContentDisposition(title: string | undefined, ext: string) {
  const raw = String(title || 'export').trim() || 'export';
  const normalized = raw.replace(/[\\/:*?"<>|]+/g, '_');
  const ascii = normalized.replace(/[^\x20-\x7E]+/g, '').replace(/\s+/g, ' ').trim() || 'export';
  const encoded = encodeURIComponent(normalized).replace(/[!'()]/g, (c) => `%${c.charCodeAt(0).toString(16)}`).replace(/\*/g, '%2A');
  return `attachment; filename="${ascii}.${ext}"; filename*=UTF-8''${encoded}.${ext}`;
}

export async function POST(req: NextRequest) {
  try {
    const limit = rateLimit(`export:${getClientIp(req)}`, 20);
    if (!limit.allowed) return NextResponse.json({ error: 'Too many export requests.' }, { status: 429 });
    const { title, content, format } = await req.json();
    if (!content || !['pdf', 'docx', 'txt'].includes(format)) return NextResponse.json({ error: 'Content and supported format are required.' }, { status: 400 });
    if (format === 'txt') return new NextResponse(content, { headers: { 'content-type': 'text/plain; charset=utf-8', 'content-disposition': buildContentDisposition(title, 'txt') } });
    const buffer = format === 'pdf' ? await renderPdfBuffer(title, content) : await renderDocxBuffer(title, content);
    const body = new Uint8Array(buffer);
    return new NextResponse(body, { headers: { 'content-type': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'content-disposition': buildContentDisposition(title, format) } });
  } catch (error) {
    console.error('Export failed:', error);
    return NextResponse.json({ error: 'Export failed.' }, { status: 500 });
  }
}
