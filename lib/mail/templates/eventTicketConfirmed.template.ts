import { EmailRow, renderEmailLayout } from './base.layout';

export type EventTicketConfirmedOptions = {
  name: string;
  eventTitle: string;
  eventDateTime?: string;
  eventLocation?: string;
  category?: string;
  eventUrl: string;
  qrImageSrc?: string;
};

export const eventTicketConfirmed = (opts: EventTicketConfirmedOptions) => {
  const rows: EmailRow[] = [
    { label: 'Événement', value: opts.eventTitle, icon: 'calendar' },
    { label: 'Invité', value: opts.name, icon: 'users' },
  ];

  if (opts.eventDateTime) {
    rows.push({
      label: 'Date & heure',
      value: opts.eventDateTime,
      icon: 'calendar',
    });
  }

  if (opts.eventLocation) {
    rows.push({
      label: 'Lieu',
      value: opts.eventLocation,
      icon: 'location',
    });
  }

  return renderEmailLayout({
    title: 'Votre billet est confirmé',
    pillLabel: 'Billet validé',
    pillIcon: 'calendar',
    headline: 'À bientôt pour',
    accent: opts.eventTitle,
    subhead: `${opts.name}, votre inscription est confirmée. Votre billet d'entrée PDF est en pièce jointe.`,
    rows,
    qrBlock: {
      title: 'QR d\'entrée',
      description: 'Présentez ce code à l\'accueil ou ouvrez le PDF joint.',
      imageSrc: opts.qrImageSrc,
    },
    ctas: [{ label: "Voir l'événement", href: opts.eventUrl }],
    footerExtra: 'contact@smart-qr.pro',
  });
};
