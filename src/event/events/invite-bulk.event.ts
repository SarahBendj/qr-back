import type { SalonEventBrand } from 'lib/mail/salon-brand';
import type { InviteCsvRow } from '../parse-invite-csv';

export const INVITE_BULK_EVENT = 'event.invite.bulk';

export type InviteBulkEventPayload = {
  batchId: string;
  eventId: string;
  category: string;
  slug: string;
  salonMark: string | null;
  brand: SalonEventBrand | null;
  privateCodeForEmail?: string;
  ownerEmail?: string;
  contactEmail?: string;
  rows: InviteCsvRow[];
  existingEmails: string[];
  guestLimit: number;
  eventTitle: string;
  eventDateTime: string;
  eventLocation?: string;
  eventCategory?: string;
};
