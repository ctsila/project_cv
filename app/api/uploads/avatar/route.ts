import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
	try {
		const limit = rateLimit(`avatar-upload:${getClientIp(req)}`, 12);
		if (!limit.allowed) return NextResponse.json({ error: 'Too many uploads.' }, { status: 429 });
		const session = await getServerSession(authOptions);
		if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		const userId = (session.user as any).id as string;
		const formData = await req.formData();
		const file = formData.get('file');
		if (!(file instanceof File)) return NextResponse.json({ error: 'Image file is required.' }, { status: 400 });
		if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Upload a PNG, JPG, or WEBP image.' }, { status: 400 });
		if (file.size > MAX_AVATAR_BYTES) return NextResponse.json({ error: 'Avatar image is too large. Use a file smaller than 5 MB.' }, { status: 400 });

		const buffer = Buffer.from(await file.arrayBuffer());
		const dataUrl = `data:${file.type};base64,${buffer.toString('base64')}`;
		const updated = await prisma.user.update({ where: { id: userId }, data: { image: dataUrl } });

		return NextResponse.json({ ok: true, image: updated.image, name: updated.name || '', email: updated.email });
	} catch (error) {
		console.error('Avatar upload failed:', error);
		return NextResponse.json({ error: 'Avatar upload failed. Please try again.' }, { status: 500 });
	}
}
