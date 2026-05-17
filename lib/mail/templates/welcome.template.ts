import { renderEmailLayout } from './base.layout';

export const welcomeTemplate = (name: string) =>
  renderEmailLayout({
    title: 'Welcome to SmartQR',
    pillLabel: 'Welcome aboard',
    pillIcon: 'mail',
    headline: `Welcome, ${name}`,
    subhead:
      'Your SmartQR account is ready. Create, manage and share professional QR codes in seconds.',
    ctas: [
      {
        label: 'Go to dashboard',
        href: 'https://smart-qr.pro',
      },
    ],
    ctaLinksHtml: `If you didn't create this account, you can safely ignore this email.`,
    footerExtra: 'contact@smart-qr.pro',
  });
