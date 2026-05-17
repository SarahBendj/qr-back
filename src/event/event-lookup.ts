import { NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

export function normalizeEventCategory(category: string | null | undefined): string {
  return (category?.trim() || 'event').toLowerCase();
}

type FindEventOpts = {
  include?: Prisma.EventInclude;
  /** When false, only slug is required (category in URL is informational). */
  matchCategory?: boolean;
};

/**
 * Slug is globally unique; category in the URL may differ by casing or be omitted in DB as "event".
 */
export async function findEventByCategoryAndSlug(
  prisma: PrismaClient,
  category: string,
  slug: string,
  opts?: FindEventOpts,
) {
  const matchCategory = opts?.matchCategory !== false;
  const slugNorm = slug.trim();
  if (!slugNorm) {
    throw new NotFoundException('EVENT_SLUG_REQUIRED');
  }

  const event = await prisma.event.findUnique({
    where: { slug: slugNorm },
    include: opts?.include,
  });

  if (!event) {
    throw new NotFoundException('EVENT_NOT_FOUND');
  }

  if (matchCategory) {
    const urlCategory = normalizeEventCategory(category);
    const eventCategory = normalizeEventCategory(event.category);
    if (urlCategory !== eventCategory) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'EVENT_CATEGORY_MISMATCH',
        message: `Use category "${event.category ?? 'event'}" for slug "${slugNorm}".`,
      });
    }
  }

  return event;
}
