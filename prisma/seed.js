/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Plan seed (CommonJS) — runs in Docker/Railway without ts-node.
 * Keeps stripePriceId in sync from env; catalog rows come from migration SQL.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TIERS = ['LITE', 'GROWTH', 'BUSINESS'];

const plans = [
  {
    tier: 'LITE',
    name: 'Basic',
    description: 'Get started for free',
    price: 0,
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
    tier: 'GROWTH',
    name: 'Growth',
    description: 'For recurring events & communities',
    price: 1599,
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
    tier: 'BUSINESS',
    name: 'Business',
    description: 'For professional event organizers',
    price: 3999,
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
    where: { tier: { notIn: TIERS } },
  });

  for (const plan of plans) {
    const { stripePriceId, ...catalog } = plan;
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      create: {
        ...catalog,
        ...(stripePriceId ? { stripePriceId } : {}),
      },
      update: {
        ...catalog,
        ...(stripePriceId ? { stripePriceId } : {}),
      },
    });
  }

  const count = await prisma.plan.count();
  if (count < 3) {
    throw new Error(
      `Expected 3 plans (LITE, GROWTH, BUSINESS) but found ${count}. Check migrations.`,
    );
  }

  console.log('Plans seeded:', plans.map((p) => p.tier).join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
