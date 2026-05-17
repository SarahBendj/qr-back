export type InvoiceOfferLine = {
  name: string;
  description?: string | null;
  features?: string[];
  tier?: string | null;
};

export type PaymentInvoiceData = {
  reference: string;
  issuedAt: string;
  issuedAtLabel: string;
  offer: InvoiceOfferLine;
  amountCents: number;
  amountLabel: string;
  currency: string;
  customerName: string;
  customerEmail: string;
  paymentId: string;
  stripeSessionId?: string | null;
  paymentMode: 'one_time' | 'subscription';
};

export type PaymentInvoiceResponse = PaymentInvoiceData & {
  pdfBase64?: string;
};
