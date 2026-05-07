-- CreateEnum
CREATE TYPE "AttendeeRole" AS ENUM ('ATTENDEE', 'SPONSOR', 'KEY_SPEAKER', 'KEY_ORGANIZER');

-- AlterTable
ALTER TABLE "attendees" ADD COLUMN     "role" "AttendeeRole" NOT NULL DEFAULT 'ATTENDEE';

-- CreateIndex
CREATE INDEX "attendees_event_id_role_idx" ON "attendees"("event_id", "role");
