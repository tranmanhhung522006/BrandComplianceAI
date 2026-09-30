-- CreateEnum
CREATE TYPE "ComplianceDocumentType" AS ENUM ('FOREIGN_LOGO_POLICY', 'BRAND_GUIDELINE', 'MAS_RULES');

-- CreateTable
CREATE TABLE "ComplianceDocument" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "documentType" "ComplianceDocumentType" NOT NULL,
    "version" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "openaiFileId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "uploadedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceDocument_openaiFileId_key" ON "ComplianceDocument"("openaiFileId");
