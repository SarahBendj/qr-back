-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('LITE', 'GROWTH', 'BUSINESS');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('event');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "googleId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "picture" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "plan" "PlanTier",
    "country" TEXT,
    "address" TEXT,
    "exceptionCode" TEXT,
    "stripeCustomerId" TEXT,
    "maxEventsOverride" INTEGER,
    "maxGuestsOverride" INTEGER,
    "maxEmailsOverride" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mark" TEXT NOT NULL,
    "displayName" TEXT,
    "tagline" TEXT,
    "aboutText" TEXT,
    "logoKey" TEXT,
    "faviconKey" TEXT,
    "bannerKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accentColor" TEXT DEFAULT '#a855f7',
    "accentColor2" TEXT DEFAULT '#ec4899',
    "pageTheme" TEXT NOT NULL DEFAULT 'dark',
    "referenceName" TEXT,
    "contactEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "footerAddress" TEXT,
    "footerPhone" TEXT,
    "footerWebsite" TEXT,
    "footerLegal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalonProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartQR" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "qrText" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,
    "pageCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SmartQR_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "justification" TEXT,
    "missionId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Idea" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT,
    "zipCode" TEXT,
    "city" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "category" TEXT,
    "date" TIMESTAMP(3),
    "time" TEXT,
    "contact" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "isPrivatePaid" BOOLEAN NOT NULL DEFAULT false,
    "eventImage" TEXT,
    "duration" TEXT,
    "mapUrl" TEXT,
    "capacity" TEXT,
    "slug" TEXT NOT NULL,
    "accessCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tags" TEXT[],
    "price" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventView" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,

    CONSTRAINT "EventView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instruction" (
    "id" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "Instruction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLink" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER,

    CONSTRAINT "EventLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "declined" BOOLEAN NOT NULL DEFAULT false,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "role" TEXT NOT NULL,
    "email" TEXT,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bg" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "gradient" TEXT NOT NULL,
    "text_primary" TEXT NOT NULL,
    "text_secondary" TEXT NOT NULL,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeSubscriptionId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSession" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "type" "PaymentType" NOT NULL,
    "token" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "interval" TEXT NOT NULL,
    "intervalCount" INTEGER NOT NULL DEFAULT 1,
    "maxEvents" INTEGER DEFAULT 1,
    "maxGuests" INTEGER DEFAULT 50,
    "maxEmails" INTEGER DEFAULT 100,
    "discount" INTEGER,
    "features" TEXT[],
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "SalonProfile_userId_key" ON "SalonProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SalonProfile_mark_key" ON "SalonProfile"("mark");

-- CreateIndex
CREATE INDEX "SalonProfile_mark_idx" ON "SalonProfile"("mark");

-- CreateIndex
CREATE UNIQUE INDEX "SmartQR_slug_key" ON "SmartQR"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Event_accessCode_key" ON "Event"("accessCode");

-- CreateIndex
CREATE INDEX "EventView_eventId_viewedAt_idx" ON "EventView"("eventId", "viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Theme_name_key" ON "Theme"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_productId_key" ON "Payment"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSession_stripeSessionId_key" ON "PaymentSession"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSession_token_key" ON "PaymentSession"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_tier_key" ON "Plan"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_stripePriceId_key" ON "Plan"("stripePriceId");

-- AddForeignKey
ALTER TABLE "SalonProfile" ADD CONSTRAINT "SalonProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartQR" ADD CONSTRAINT "SmartQR_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventView" ADD CONSTRAINT "EventView_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instruction" ADD CONSTRAINT "Instruction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLink" ADD CONSTRAINT "EventLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed catalog plans (LITE / GROWTH / BUSINESS)
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
