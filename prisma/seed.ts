import { PlanTier, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const plans = [
  {
    tier: PlanTier.LITE,
    name: 'Lite',
    description: 'Perfect for single events & creators',
    price: 900,
    currency: 'USD',
    interval: 'month',
    intervalCount: 1,
    maxEvents: 2,
    maxGuests: 75,
    maxEmails: 500,
    features: [
      'Dynamic QR Codes',
      'RSVP Management',
      'Event Page',
      'Basic Analytics',
    ],
    stripePriceId: process.env.STRIPE_PRICE_LITE,
  },
  {
    tier: PlanTier.GROWTH,
    name: 'Growth',
    description: 'For recurring events & communities',
    price: 2900,
    currency: 'USD',
    interval: 'month',
    intervalCount: 1,
    maxEvents: 10,
    maxGuests: 250,
    maxEmails: 5000,
    features: [
      'Dynamic QR Codes',
      'RSVP Management',
      'Private Events',
      'Email Reminders',
      'Custom Branding',
      'Guest Management',
    ],
    stripePriceId: process.env.STRIPE_PRICE_GROWTH,
  },
  {
    tier: PlanTier.BUSINESS,
    name: 'Business',
    description: 'For professional event organizers',
    price: 7900,
    currency: 'USD',
    interval: 'month',
    intervalCount: 1,
    maxEvents: 50,
    maxGuests: 1000,
    maxEmails: 25000,
    features: [
      'QR Check-in System',
      'Advanced Analytics',
      'Guest Export',
      'Team Access',
      'Priority Support',
      'Custom Domains',
      'API Access',
    ],
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS,
  },
];

async function main() {
  await prisma.plan.deleteMany({
    where: {
      tier: { notIn: [PlanTier.LITE, PlanTier.GROWTH, PlanTier.BUSINESS] },
    },
  });

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      create: plan,
      update: {
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval,
        intervalCount: plan.intervalCount,
        maxEvents: plan.maxEvents,
        maxGuests: plan.maxGuests,
        maxEmails: plan.maxEmails,
        features: plan.features,
        ...(plan.stripePriceId
          ? { stripePriceId: plan.stripePriceId }
          : {}),
      },
    });
  }
  console.log('Plans seeded:', plans.map((p) => p.tier).join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
