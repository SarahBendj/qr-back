import { Event, SmartQR } from '@prisma/client';
import {
  countEventGuests,
  resolveGuestLimit,
} from '../event/event.constants';

export type EventInviteQuota = {
  guestCount: number;
  guestLimit: number;
  remaining: number;
  isFull: boolean;
};

type EventWithParticipants = Event & {
  participants: { role: string }[];
};

function mapEventInviteQuota(event: EventWithParticipants): EventInviteQuota {
  const guestLimit = resolveGuestLimit(event.capacity);
  const guestCount = countEventGuests(event.participants ?? []);
  const remaining = Math.max(0, guestLimit - guestCount);
  return {
    guestCount,
    guestLimit,
    remaining,
    isFull: remaining <= 0,
  };
}

export function mapProfilEvent(event: EventWithParticipants) {
  const inviteQuota = mapEventInviteQuota(event);
  return {
    id: event.id,
    title: event.title,
    name: event.title,
    category: event.category,
    slug: event.slug,
    date: event.date,
    location: event.location,
    isPrivate: event.isPrivate,
    capacity: event.capacity,
    inviteQuota,
  };
}

export type ProfilPlanStatus = {
  planPaid: boolean;
  planActive: boolean;
};

type UserProfilRow = {
  id: string;
  name: string | null;
  email: string;
  picture: string | null;
  role: string;
  plan: string | null;
  createdAt: Date;
  updatedAt: Date;
  events: EventWithParticipants[];
  smartQrs: SmartQR[];
};

function splitDisplayName(name: string | null | undefined) {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) {
    return { firstname: '', lastname: '' };
  }
  const parts = trimmed.split(/\s+/);
  return {
    firstname: parts[0] ?? '',
    lastname: parts.slice(1).join(' '),
  };
}

/** Legacy « salon » shape — maps SmartQR rows for /myprofile compatibility */
export function mapSmartQrToCandidate(qr: SmartQR) {
  return {
    id: qr.id,
    slug: qr.slug,
    title: qr.qrText,
    qrText: qr.qrText,
    x: qr.x,
    y: qr.y,
    size: qr.size,
    pageCount: qr.pageCount,
    createdAt: qr.createdAt,
  };
}

export function mapProfilResponse(
  user: UserProfilRow,
  planStatus: ProfilPlanStatus,
) {
  const { firstname, lastname } = splitDisplayName(user.name);
  const candidates = user.smartQrs.map(mapSmartQrToCandidate);
  const candidate = candidates[0] ?? null;

  return {
    id: user.id,
    name: user.name,
    firstname,
    lastname,
    email: user.email,
    picture: user.picture,
    role: user.role,
    plan: user.plan ?? null,
    planPaid: planStatus.planPaid,
    planActive: planStatus.planActive,
    model: null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    events: user.events.map(mapProfilEvent),
    smartQrs: user.smartQrs,
    candidate,
    candidates,
  };
}
