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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalonProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalonProfile_userId_key" ON "SalonProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SalonProfile_mark_key" ON "SalonProfile"("mark");

-- CreateIndex
CREATE INDEX "SalonProfile_mark_idx" ON "SalonProfile"("mark");

-- AddForeignKey
ALTER TABLE "SalonProfile" ADD CONSTRAINT "SalonProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
