export function isExemptedEmail(email: string): boolean {
  if (!email) return false;

  const normalizedEmail = email.toLowerCase();

  const exemptedMails = Object.keys(process.env)
    .filter((key) => key.startsWith('MAIL_XP') && process.env[key])
    .map((key) => process.env[key]!.toLowerCase());

  return exemptedMails.includes(normalizedEmail);
}
