-- Seed catalog plans after PlanTier migration (previous migration deleted all rows).

INSERT INTO "Plan" (
  id,
  tier,
  name,
  description,
  price,
  currency,
  "interval",
  "intervalCount",
  "maxEvents",
  "maxGuests",
  "maxEmails",
  features,
  "createdAt",
  "updatedAt"
)
VALUES
  (
    gen_random_uuid()::text,
    'LITE',
    'Lite',
    'Perfect for single events & creators',
    900,
    'USD',
    'month',
    1,
    2,
    75,
    500,
    ARRAY[
      'Dynamic QR Codes',
      'RSVP Management',
      'Event Page',
      'Basic Analytics'
    ],
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid()::text,
    'GROWTH',
    'Growth',
    'For recurring events & communities',
    2900,
    'USD',
    'month',
    1,
    10,
    250,
    5000,
    ARRAY[
      'Dynamic QR Codes',
      'RSVP Management',
      'Private Events',
      'Email Reminders',
      'Custom Branding',
      'Guest Management'
    ],
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid()::text,
    'BUSINESS',
    'Business',
    'For professional event organizers',
    7900,
    'USD',
    'month',
    1,
    50,
    1000,
    25000,
    ARRAY[
      'QR Check-in System',
      'Advanced Analytics',
      'Guest Export',
      'Team Access',
      'Priority Support',
      'Custom Domains',
      'API Access'
    ],
    NOW(),
    NOW()
  )
ON CONFLICT (tier) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  "interval" = EXCLUDED."interval",
  "intervalCount" = EXCLUDED."intervalCount",
  "maxEvents" = EXCLUDED."maxEvents",
  "maxGuests" = EXCLUDED."maxGuests",
  "maxEmails" = EXCLUDED."maxEmails",
  features = EXCLUDED.features,
  "updatedAt" = NOW();
