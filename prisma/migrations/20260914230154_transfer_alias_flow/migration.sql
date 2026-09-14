/*
  Warnings:

  - You are about to drop the column `mpInitPoint` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `mpPaymentId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `mpPreferenceId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `Order` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "capacity" INTEGER,
    "transferAlias" TEXT NOT NULL DEFAULT '',
    "accountHolder" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Event" ("capacity", "createdAt", "currency", "date", "description", "id", "location", "name", "priceCents", "slug") SELECT "capacity", "createdAt", "currency", "date", "description", "id", "location", "name", "priceCents", "slug" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "personalToken" TEXT NOT NULL,
    "ticketCode" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "declaredPaidAt" DATETIME,
    "approvedAt" DATETIME,
    "rejectedAt" DATETIME,
    CONSTRAINT "Order_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("amountCents", "approvedAt", "buyerEmail", "buyerName", "createdAt", "currency", "eventId", "id", "personalToken", "quantity", "rejectedAt", "status", "ticketCode") SELECT "amountCents", "approvedAt", "buyerEmail", "buyerName", "createdAt", "currency", "eventId", "id", "personalToken", "quantity", "rejectedAt", "status", "ticketCode" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_personalToken_key" ON "Order"("personalToken");
CREATE UNIQUE INDEX "Order_ticketCode_key" ON "Order"("ticketCode");
CREATE INDEX "Order_eventId_idx" ON "Order"("eventId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
