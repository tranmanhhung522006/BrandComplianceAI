/*
  Warnings:

  - A unique constraint covering the columns `[campaignId,documentType,version]` on the table `ComplianceDocument` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ComplianceDocument" ADD COLUMN     "campaignId" INTEGER;

-- CreateIndex
CREATE INDEX "ComplianceDocument_campaignId_documentType_isActive_idx" ON "ComplianceDocument"("campaignId", "documentType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceDocument_campaignId_documentType_version_key" ON "ComplianceDocument"("campaignId", "documentType", "version");

-- AddForeignKey
ALTER TABLE "ComplianceDocument" ADD CONSTRAINT "ComplianceDocument_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceDocument" ADD CONSTRAINT "ComplianceDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
