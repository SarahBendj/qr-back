import { isInviteEmailException } from './invite-email-exception';

export type InviteCsvRow = {
  email: string;
  name: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseInviteCsv(buffer: Buffer): InviteCsvRow[] {
  const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const delimiter = lines[0].includes(';') ? ';' : ',';
  let startIndex = 0;
  if (lines[0].toLowerCase().includes('email')) {
    startIndex = 1;
  }

  const seen = new Set<string>();
  const rows: InviteCsvRow[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i]
      .split(delimiter)
      .map((p) => p.trim().replace(/^"|"$/g, ''));
    const email = (parts[0] ?? '').toLowerCase();
    if (!email || !EMAIL_RE.test(email)) {
      continue;
    }
    if (!isInviteEmailException(email)) {
      if (seen.has(email)) {
        continue;
      }
      seen.add(email);
    }
    const name = (parts[1] ?? '').trim() || email.split('@')[0] || 'Invité';
    rows.push({ email, name });
  }

  return rows;
}
