import { EmailRow, renderEmailLayout } from './base.layout';

export type JoinEventMailOptions = {
  name: string;
  eventTitle: string;
  confirmUrl: string;
  declineUrl: string;
  eventDateTime?: string;
  eventLocation?: string;
  category?: string;
  qrImageSrc?: string;
  /** Plain access code for private events */
  accessCode?: string;
};

export const joinEvent = (opts: JoinEventMailOptions) => {
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

  if (opts.category) {
    rows.push({
      label: 'Catégorie',
      value: opts.category,
      icon: 'link',
    });
  }

  if (opts.accessCode?.trim()) {
    rows.push({
      label: "Code d'accès",
      value: opts.accessCode.trim(),
      icon: 'qr',
    });
  }

  return renderEmailLayout({
    title: 'Confirmez votre inscription',
    pillLabel: 'Votre billet événement',
    pillIcon: 'calendar',
    headline: 'Vous êtes invité à',
    accent: opts.eventTitle,
    subhead: `Bonjour ${opts.name}, une place vous est réservée. Confirmez votre participation pour activer votre billet d'entrée (PDF joint).`,
    rows,
    qrBlock: {
      title: 'Votre QR billet',
      description:
        'Après confirmation, présentez ce QR à l\'entrée. Le PDF en pièce jointe contient votre billet imprimable.',
      imageSrc: opts.qrImageSrc,
    },
    ctas: [
      { label: 'Confirmer ma place', href: opts.confirmUrl },
      { label: 'Décliner', href: opts.declineUrl, variant: 'secondary' },
    ],
    ctaLinksHtml:
      'Vous n\'êtes pas à l\'origine de cette inscription ? Ignorez cet e-mail.',
    footerExtra: 'contact@smart-qr.pro',
  });
};
