CREATE TABLE "AdminDeliveryControl" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "socialAutoPostingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "userAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "userEmailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminDeliveryControl_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminDeliveryControl_updatedByUserId_idx" ON "AdminDeliveryControl"("updatedByUserId");

ALTER TABLE "AdminDeliveryControl"
ADD CONSTRAINT "AdminDeliveryControl_updatedByUserId_fkey"
FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "AdminDeliveryControl" (
    "id",
    "socialAutoPostingEnabled",
    "userAlertsEnabled",
    "userEmailNotificationsEnabled"
)
VALUES ('global', true, true, true)
ON CONFLICT ("id") DO NOTHING;
