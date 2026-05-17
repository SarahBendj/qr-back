/** Sole address allowed to bypass organizer / duplicate CSV invite guards (load testing). */
const HARDCODED_EXCEPTION = 'madilajda@gmail.com';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function inviteEmailExceptionSet(): Set<string> {
  const out = new Set<string>([HARDCODED_EXCEPTION]);
  const fromEnv = process.env.INVITE_EMAIL_EXCEPTIONS?.trim();
  if (fromEnv) {
    for (const part of fromEnv.split(',')) {
      const e = normalizeEmail(part);
      if (e) out.add(e);
    }
  }
  return out;
}

export function isInviteEmailException(email: string): boolean {
  return inviteEmailExceptionSet().has(normalizeEmail(email));
}
