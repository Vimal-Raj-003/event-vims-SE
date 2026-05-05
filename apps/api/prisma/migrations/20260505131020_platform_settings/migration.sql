-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "platform_name" TEXT NOT NULL DEFAULT 'VIMS Event Networking',
    "support_email" TEXT NOT NULL DEFAULT 'admin@vimsenterprise.com',
    "data_retention_months" INTEGER NOT NULL DEFAULT 12,
    "allow_organiser_self_signup" BOOLEAN NOT NULL DEFAULT true,
    "card_to_card_qr_connections" BOOLEAN NOT NULL DEFAULT false,
    "cross_event_networks" BOOLEAN NOT NULL DEFAULT false,
    "multi_language_support" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- Seed singleton row
INSERT INTO "platform_settings" ("id", "updated_at")
VALUES ('platform', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
