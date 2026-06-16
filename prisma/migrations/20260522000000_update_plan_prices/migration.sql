-- Catalog: Basic FREE, Growth $15.99/mo, Business $39.99/mo (amounts in cents)
UPDATE "Plan"
SET
  name = 'Basic',
  description = 'Get started for free',
  price = 0,
  "stripePriceId" = NULL,
  "updatedAt" = NOW()
WHERE tier = 'LITE';

UPDATE "Plan"
SET
  price = 1599,
  "stripePriceId" = NULL,
  "updatedAt" = NOW()
WHERE tier = 'GROWTH';

UPDATE "Plan"
SET
  price = 3999,
  "stripePriceId" = NULL,
  "updatedAt" = NOW()
WHERE tier = 'BUSINESS';
