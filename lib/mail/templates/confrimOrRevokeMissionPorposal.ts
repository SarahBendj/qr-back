import { renderEmailLayout } from './base.layout';

export const confirmOrRevokeMissionProposal = (
  recruiterName: string,
  position: string,
  companyName: string,
  cancelUrl?: string,
) =>
  renderEmailLayout({
    title: 'Mission proposal received',
    pillLabel: 'Mission proposal',
    pillIcon: 'briefcase',
    headline: 'Proposal received',
    accent: `${position} at ${companyName}`,
    subhead: `Hello ${recruiterName}, we have received your mission proposal. The candidate will review it and get back to you.`,
    rows: [
      {
        label: 'Position',
        value: position,
        icon: 'briefcase',
      },
      {
        label: 'Company',
        value: companyName,
        icon: 'users',
      },
    ],
    ctas: cancelUrl
      ? [
          {
            label: 'Withdraw this proposal',
            href: cancelUrl,
            variant: 'secondary',
          },
        ]
      : undefined,
    bodyHtml: cancelUrl
      ? 'Changed your mind? You can withdraw this proposal at any time (no login required).'
      : undefined,
    ctaLinksHtml: `Questions? <a href="mailto:contact@smart-qr.pro">Contact us</a>`,
    footerExtra: 'contact@smart-qr.pro',
  });
