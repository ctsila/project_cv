import { prisma } from '@/lib/db';

export async function enqueueGenerationJob(userId: string, type: string, input: unknown) {
  return prisma.generationJob.create({ data: { userId, type, input: input as any, status: 'queued' } });
}

export async function claimNextGenerationJob() {
  const job = await prisma.generationJob.findFirst({ where: { status: 'queued' }, orderBy: { createdAt: 'asc' } });
  if (!job) return null;
  return prisma.generationJob.update({ where: { id: job.id }, data: { status: 'running' } });
}

export async function completeGenerationJob(id: string, output: unknown) {
  return prisma.generationJob.update({ where: { id }, data: { status: 'completed', output: output as any } });
}

export async function failGenerationJob(id: string, error: unknown) {
  return prisma.generationJob.update({ where: { id }, data: { status: 'failed', error: error instanceof Error ? error.message : String(error) } });
}
