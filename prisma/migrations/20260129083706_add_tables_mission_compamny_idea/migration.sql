-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "companyId" TEXT,
    "position" TEXT NOT NULL,
    "location" TEXT,
    "type" TEXT NOT NULL,
    "salary" TEXT,
    "description" TEXT,
    "requirements" TEXT,
    "startDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "matchScore" INTEGER,
    "recruiterName" TEXT,
    "recruiterEmail" TEXT,
    "recruiterPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Idea" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
