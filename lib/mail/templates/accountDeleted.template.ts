import { renderEmailLayout } from './base.layout';

export const accountDeletedTemplate = (name: string) =>
  renderEmailLayout({
    title: 'Your SmartQR account has been deleted',
    pillLabel: 'Account closed',
    pillIcon: 'mail',
    headline: `Thank you, ${name}`,
    accent: 'Your account has been deleted',
    subhead:
      'We are sorry to see you go. Your SmartQR account and all associated data have been permanently removed from our systems.',
    rows: [
      {
        label: 'Status',
        value: 'Account permanently deleted',
        icon: 'mail',
      },
      {
        label: 'What was removed',
        value: 'Profile, QR codes, events, and payment records linked to your account',
        icon: 'link',
      },
    ],
    bodyHtml:
      'This action cannot be undone. If you did not request this deletion, please contact us immediately.',
    ctaLinksHtml: `Questions? <a href="mailto:contact@smart-qr.pro">Contact us</a>`,
    footerExtra: 'contact@smart-qr.pro',
  });
