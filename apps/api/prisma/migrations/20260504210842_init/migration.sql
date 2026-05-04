-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('EVENT_ISSUE', 'ATTENDEE_ISSUE', 'TECHNICAL', 'ACCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ORGANISER', 'ATTENDEE');

-- CreateEnum
CREATE TYPE "OrganiserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DELETED');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "DeletionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED');

-- CreateTable
CREATE TABLE "super_admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organisation" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "status" "OrganiserStatus" NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "organiser_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "short_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "venue" TEXT NOT NULL,
    "venue_map_url" TEXT,
    "expected_count" INTEGER,
    "brand_logo_url" TEXT,
    "brand_primary" TEXT NOT NULL DEFAULT '#4F46E5',
    "brand_secondary" TEXT NOT NULL DEFAULT '#818CF8',
    "banner_url" TEXT,
    "qr_url" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_field_config" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "field_key" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "event_field_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_rules" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "max_connections_per_attendee" TEXT,
    "show_address_after_accept" BOOLEAN NOT NULL DEFAULT true,
    "allow_vcard_download" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "event_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendees" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "business_type" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "services" JSONB NOT NULL DEFAULT '[]',
    "city" TEXT NOT NULL,
    "address" TEXT,
    "company_size" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "profile_photo_url" TEXT,
    "company_logo_url" TEXT,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_paused" BOOLEAN NOT NULL DEFAULT false,
    "consent_given" BOOLEAN NOT NULL DEFAULT false,
    "consented_at" TIMESTAMP(3),
    "age" INTEGER,
    "sex" TEXT,
    "occupation" TEXT,
    "interested_in" JSONB NOT NULL DEFAULT '[]',
    "networking_goals" JSONB NOT NULL DEFAULT '[]',
    "profile_completed" BOOLEAN NOT NULL DEFAULT false,
    "profile_completed_at" TIMESTAMP(3),
    "linkedin_url" TEXT,
    "website_url" TEXT,
    "twitter_handle" TEXT,
    "profile_view_count" INTEGER NOT NULL DEFAULT 0,
    "card_share_count" INTEGER NOT NULL DEFAULT 0,
    "qr_scan_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connection_requests" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "message" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "connection_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "organiser_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "link_url" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "opened_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_deletion_requests" (
    "id" TEXT NOT NULL,
    "requester_email" TEXT NOT NULL,
    "event_id" TEXT,
    "reason" TEXT,
    "status" "DeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "processed_by" TEXT,

    CONSTRAINT "data_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_verifications" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_role" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "attendee_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "attendee_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "related_entity_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "organiser_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "admin_note" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organiser_settings" (
    "id" TEXT NOT NULL,
    "organiser_id" TEXT NOT NULL,
    "default_brand_primary" TEXT NOT NULL DEFAULT '#4F46E5',
    "default_brand_secondary" TEXT NOT NULL DEFAULT '#818CF8',
    "default_max_connections" TEXT NOT NULL DEFAULT '50',
    "default_show_address" BOOLEAN NOT NULL DEFAULT true,
    "default_allow_vcard" BOOLEAN NOT NULL DEFAULT true,
    "notify_attendee_register" BOOLEAN NOT NULL DEFAULT true,
    "notify_connection_milestone" BOOLEAN NOT NULL DEFAULT true,
    "notify_announcement_delivery" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organiser_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_views" (
    "id" TEXT NOT NULL,
    "viewer_id" TEXT NOT NULL,
    "viewed_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'directory',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connection_notes" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connection_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_scores" (
    "id" TEXT NOT NULL,
    "attendee_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "match_reasons" JSONB NOT NULL DEFAULT '[]',
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "attendee_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "super_admins_email_key" ON "super_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organisers_email_key" ON "organisers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "events_short_hash_key" ON "events"("short_hash");

-- CreateIndex
CREATE INDEX "events_organiser_id_idx" ON "events"("organiser_id");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "events_start_at_idx" ON "events"("start_at");

-- CreateIndex
CREATE UNIQUE INDEX "event_field_config_event_id_field_key_key" ON "event_field_config"("event_id", "field_key");

-- CreateIndex
CREATE UNIQUE INDEX "event_rules_event_id_key" ON "event_rules"("event_id");

-- CreateIndex
CREATE INDEX "attendees_event_id_idx" ON "attendees"("event_id");

-- CreateIndex
CREATE INDEX "attendees_event_id_business_type_idx" ON "attendees"("event_id", "business_type");

-- CreateIndex
CREATE INDEX "attendees_event_id_industry_idx" ON "attendees"("event_id", "industry");

-- CreateIndex
CREATE INDEX "attendees_event_id_city_idx" ON "attendees"("event_id", "city");

-- CreateIndex
CREATE INDEX "attendees_event_id_company_size_idx" ON "attendees"("event_id", "company_size");

-- CreateIndex
CREATE INDEX "idx_att_company_trgm" ON "attendees" USING GIN ("company" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "idx_att_directory" ON "attendees"("event_id", "business_type", "industry", "city");

-- CreateIndex
CREATE INDEX "idx_att_fname_trgm" ON "attendees" USING GIN ("first_name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "idx_att_services_gin" ON "attendees" USING GIN ("services");

-- CreateIndex
CREATE INDEX "idx_att_tags_gin" ON "attendees" USING GIN ("tags");

-- CreateIndex
CREATE UNIQUE INDEX "attendees_event_id_email_key" ON "attendees"("event_id", "email");

-- CreateIndex
CREATE INDEX "connection_requests_event_id_receiver_id_status_idx" ON "connection_requests"("event_id", "receiver_id", "status");

-- CreateIndex
CREATE INDEX "connection_requests_event_id_sender_id_status_idx" ON "connection_requests"("event_id", "sender_id", "status");

-- CreateIndex
CREATE INDEX "connection_requests_event_id_status_idx" ON "connection_requests"("event_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "connection_requests_event_id_sender_id_receiver_id_key" ON "connection_requests"("event_id", "sender_id", "receiver_id");

-- CreateIndex
CREATE INDEX "announcements_event_id_sent_at_idx" ON "announcements"("event_id", "sent_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "data_deletion_requests_status_idx" ON "data_deletion_requests"("status");

-- CreateIndex
CREATE INDEX "data_deletion_requests_requester_email_idx" ON "data_deletion_requests"("requester_email");

-- CreateIndex
CREATE INDEX "otp_verifications_email_purpose_expires_at_idx" ON "otp_verifications"("email", "purpose", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_user_role_idx" ON "refresh_tokens"("user_id", "user_role");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_attendee_id_idx" ON "push_subscriptions"("attendee_id");

-- CreateIndex
CREATE INDEX "notifications_attendee_id_is_read_idx" ON "notifications"("attendee_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_attendee_id_created_at_idx" ON "notifications"("attendee_id", "created_at");

-- CreateIndex
CREATE INDEX "support_tickets_organiser_id_idx" ON "support_tickets"("organiser_id");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "organiser_settings_organiser_id_key" ON "organiser_settings"("organiser_id");

-- CreateIndex
CREATE INDEX "profile_views_viewed_id_created_at_idx" ON "profile_views"("viewed_id", "created_at");

-- CreateIndex
CREATE INDEX "profile_views_viewer_id_event_id_idx" ON "profile_views"("viewer_id", "event_id");

-- CreateIndex
CREATE INDEX "profile_views_event_id_created_at_idx" ON "profile_views"("event_id", "created_at");

-- CreateIndex
CREATE INDEX "connection_notes_author_id_connection_id_idx" ON "connection_notes"("author_id", "connection_id");

-- CreateIndex
CREATE INDEX "connection_notes_event_id_idx" ON "connection_notes"("event_id");

-- CreateIndex
CREATE INDEX "match_scores_attendee_id_score_idx" ON "match_scores"("attendee_id", "score");

-- CreateIndex
CREATE INDEX "match_scores_event_id_score_idx" ON "match_scores"("event_id", "score");

-- CreateIndex
CREATE UNIQUE INDEX "match_scores_attendee_id_target_id_key" ON "match_scores"("attendee_id", "target_id");

-- CreateIndex
CREATE INDEX "activities_attendee_id_created_at_idx" ON "activities"("attendee_id", "created_at");

-- CreateIndex
CREATE INDEX "activities_event_id_type_idx" ON "activities"("event_id", "type");

-- CreateIndex
CREATE INDEX "activities_created_at_idx" ON "activities"("created_at");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organiser_id_fkey" FOREIGN KEY ("organiser_id") REFERENCES "organisers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_field_config" ADD CONSTRAINT "event_field_config_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rules" ADD CONSTRAINT "event_rules_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "attendees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "attendees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_organiser_id_fkey" FOREIGN KEY ("organiser_id") REFERENCES "organisers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "organisers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_deletion_requests" ADD CONSTRAINT "data_deletion_requests_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_attendee_id_fkey" FOREIGN KEY ("attendee_id") REFERENCES "attendees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_attendee_id_fkey" FOREIGN KEY ("attendee_id") REFERENCES "attendees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_organiser_id_fkey" FOREIGN KEY ("organiser_id") REFERENCES "organisers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organiser_settings" ADD CONSTRAINT "organiser_settings_organiser_id_fkey" FOREIGN KEY ("organiser_id") REFERENCES "organisers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "attendees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_viewed_id_fkey" FOREIGN KEY ("viewed_id") REFERENCES "attendees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_notes" ADD CONSTRAINT "connection_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "attendees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_scores" ADD CONSTRAINT "match_scores_attendee_id_fkey" FOREIGN KEY ("attendee_id") REFERENCES "attendees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_scores" ADD CONSTRAINT "match_scores_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "attendees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_attendee_id_fkey" FOREIGN KEY ("attendee_id") REFERENCES "attendees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

