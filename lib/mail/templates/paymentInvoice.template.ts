import { renderEmailLayout } from './base.layout';
import type { PaymentInvoiceData } from '../../invoice/payment-invoice.types';

export const paymentInvoiceTemplate = (invoice: PaymentInvoiceData) =>
  renderEmailLayout({
    title: `Facture ${invoice.reference}`,
    pillLabel: 'Paiement confirmé',
    pillIcon: 'wallet',
    headline: 'Merci pour votre paiement',
    accent: invoice.amountLabel,
    subhead: `${invoice.customerName}, votre facture est disponible en pièce jointe (PDF).`,
    rows: [
      {
        label: 'Référence',
        value: invoice.reference,
        icon: 'link',
      },
      {
        label: 'Date',
        value: invoice.issuedAtLabel,
        icon: 'calendar',
      },
      {
        label: 'Offre',
        value: invoice.offer.name,
        icon: 'briefcase',
      },
    ],
    bodyHtml:
      'Conservez ce document pour votre comptabilité. En cas de question, répondez à cet e-mail.',
    footerExtra: 'contact@smart-qr.pro',
  });
