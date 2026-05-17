import { BadRequestException } from '@nestjs/common';

/** Hard cap on guests (non-organizers) per event */
export const MAX_GUESTS_PER_EVENT = 1000;

export function validateAndStringifyCapacity(
  capacity: number | string | null | undefined,
): string | null {
  if (capacity === undefined || capacity === null || capacity === '') {
    return null;
  }
  const n = Number(capacity);
  if (!Number.isFinite(n) || n < 1) {
    throw new BadRequestException('INVALID_CAPACITY');
  }
  if (n > MAX_GUESTS_PER_EVENT) {
    throw new BadRequestException('CAPACITY_EXCEEDS_MAX_GUESTS');
  }
  return String(Math.floor(n));
}

/** Effective guest limit: min(organizer capacity, 1000), default 1000 if unset */
export function resolveGuestLimit(
  capacity: string | null | undefined,
): number {
  const n = capacity ? Number(capacity) : 0;
  if (!Number.isFinite(n) || n < 1) {
    return MAX_GUESTS_PER_EVENT;
  }
  return Math.min(Math.floor(n), MAX_GUESTS_PER_EVENT);
}

export function countEventGuests(
  participants: { role: string }[],
): number {
  return participants.filter((p) => p.role !== 'Organizer').length;
}
