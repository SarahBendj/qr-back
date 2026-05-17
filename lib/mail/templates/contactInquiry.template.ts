import { renderEmailLayout } from './base.layout';

export function contactInquiryTemplate(
  senderEmail: string,
  topic: string,
  message: string,
): string {
  const escaped = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  return renderEmailLayout({
    title: 'Nouveau message contact',
    pillLabel: 'Contact',
    pillIcon: 'mail',
    headline: 'Nouveau message',
    accent: topic,
    subhead: `De : ${senderEmail}`,
    bodyHtml: `<div style="text-align:left;max-width:480px;margin:0 auto;padding:16px;background-color:#f8f5fc;border:2px solid #2B1250;border-radius:12px;"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b5b8a;">Message</p><p style="margin:0;white-space:pre-wrap;line-height:1.65;color:#1e0a3c;">${escaped(message)}</p></div>`,
  });
}
