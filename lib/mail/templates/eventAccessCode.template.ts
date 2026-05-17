import { renderEmailLayout } from './base.layout';

export type EventAccessCodeMailOptions = {
  name: string;
  eventTitle: string;
  accessCode: string;
  eventUrl: string;
  category?: string;
};

export const eventAccessCodeTemplate = (opts: EventAccessCodeMailOptions) => {
  return renderEmailLayout({
    title: 'Événement privé',
    headline: 'Votre événement est maintenant privé',
    subhead: `Voici votre code d'accès. Partagez-le avec vos invités.`,
    featuredCode: opts.accessCode,
  });
};
