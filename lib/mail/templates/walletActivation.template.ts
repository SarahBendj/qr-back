import { renderEmailLayout } from './base.layout';

export const walletActivationTemplate = (
  name: string,
  applePassUrl: string,
  googleSaveUrl: string,
  portfolioUrl: string,
) =>
  renderEmailLayout({
    title: 'Activez votre carte SmartQR',
    pillLabel: 'SmartQR Wallet',
    pillIcon: 'wallet',
    headline: 'Your SmartQR card is ready',
    accent: name || 'there',
    subhead:
      'Add your card to Apple or Google Wallet and share your profile in one scan.',
    rows: [
      {
        label: 'Public profile',
        value: portfolioUrl,
        icon: 'link',
      },
    ],
    qrBlock: {
      title: 'Scan to open your profile',
      description:
        'Your digital card links to your public profile. Share it anywhere: events, networking, or on the go.',
    },
    ctas: [
      {
        label: 'Add to Google Wallet',
        href: googleSaveUrl,
      },
      {
        label: 'Download Apple Wallet (.pkpass)',
        href: applePassUrl,
        variant: 'secondary',
      },
    ],
    ctaLinksHtml: `Or open your profile: <a href="${portfolioUrl}">View profile</a>`,
    footerExtra: 'contact@smart-qr.pro',
  });
