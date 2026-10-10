-- Add archival timestamp for non-destructive campaign lifecycle management
ALTER TABLE "Campaign"
ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Campaign_archivedAt_idx"
ON "Campaign"("archivedAt");
