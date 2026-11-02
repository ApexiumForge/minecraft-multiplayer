ALTER TABLE "SaleJob" ADD COLUMN "claimTokenHash" TEXT;
ALTER TABLE "SaleJob" ADD COLUMN "claimedAt" DATETIME;
ALTER TABLE "SaleJob" ADD COLUMN "appliedAt" DATETIME;
ALTER TABLE "SaleJob" ADD COLUMN "completedAt" DATETIME;
ALTER TABLE "SaleJob" ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "InventorySnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "countsJson" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventorySnapshot_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InventorySnapshot_playerId_key" ON "InventorySnapshot"("playerId");
