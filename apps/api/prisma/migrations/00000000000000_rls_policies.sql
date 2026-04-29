-- RLS Policies for Multi-Tenant Isolation
-- Applied after initial Prisma migration

-- Enable RLS on all tenant-scoped tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_field_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ═══ EVENTS ═══
-- Organiser can see/manage only their own events
CREATE POLICY organiser_own_events ON events
  FOR ALL
  USING (organiser_id = current_setting('app.current_organiser_id', true)::text)
  WITH CHECK (organiser_id = current_setting('app.current_organiser_id', true)::text);

-- Super Admin bypass for events
CREATE POLICY super_admin_bypass_events ON events
  FOR ALL
  USING (current_setting('app.is_super_admin', true)::boolean = true);

-- Public read for published events (QR resolution)
CREATE POLICY public_read_published_events ON events
  FOR SELECT
  USING (status = 'PUBLISHED' AND current_setting('app.current_organiser_id', true) = '');

-- ═══ ATTENDEES ═══
-- Event-scoped: only see attendees in the current event
CREATE POLICY event_scoped_attendees ON attendees
  FOR ALL
  USING (event_id = current_setting('app.current_event_id', true)::text)
  WITH CHECK (event_id = current_setting('app.current_event_id', true)::text);

-- Super Admin bypass for attendees
CREATE POLICY super_admin_bypass_attendees ON attendees
  FOR ALL
  USING (current_setting('app.is_super_admin', true)::boolean = true);

-- Organiser can see attendees of their own events
CREATE POLICY organiser_read_attendees ON attendees
  FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE organiser_id = current_setting('app.current_organiser_id', true)::text
    )
  );

-- ═══ CONNECTION REQUESTS ═══
CREATE POLICY event_scoped_connections ON connection_requests
  FOR ALL
  USING (event_id = current_setting('app.current_event_id', true)::text)
  WITH CHECK (event_id = current_setting('app.current_event_id', true)::text);

CREATE POLICY super_admin_bypass_connections ON connection_requests
  FOR ALL
  USING (current_setting('app.is_super_admin', true)::boolean = true);

-- ═══ ANNOUNCEMENTS ═══
CREATE POLICY event_scoped_announcements ON announcements
  FOR ALL
  USING (event_id = current_setting('app.current_event_id', true)::text)
  WITH CHECK (event_id = current_setting('app.current_event_id', true)::text);

CREATE POLICY super_admin_bypass_announcements ON announcements
  FOR ALL
  USING (current_setting('app.is_super_admin', true)::boolean = true);

-- ═══ EVENT FIELD CONFIG ═══
CREATE POLICY event_scoped_field_config ON event_field_config
  FOR ALL
  USING (event_id = current_setting('app.current_event_id', true)::text)
  WITH CHECK (event_id = current_setting('app.current_event_id', true)::text);

CREATE POLICY super_admin_bypass_field_config ON event_field_config
  FOR ALL
  USING (current_setting('app.is_super_admin', true)::boolean = true);

-- ═══ EVENT RULES ═══
CREATE POLICY event_scoped_rules ON event_rules
  FOR ALL
  USING (event_id = current_setting('app.current_event_id', true)::text)
  WITH CHECK (event_id = current_setting('app.current_event_id', true)::text);

CREATE POLICY super_admin_bypass_rules ON event_rules
  FOR ALL
  USING (current_setting('app.is_super_admin', true)::boolean = true);

-- ═══ NOTIFICATIONS ═══
CREATE POLICY event_scoped_notifications ON notifications
  FOR ALL
  USING (event_id = current_setting('app.current_event_id', true)::text)
  WITH CHECK (event_id = current_setting('app.current_event_id', true)::text);

-- ═══ ADDITIONAL INDEXES ═══

-- Composite index for directory filter combination
CREATE INDEX idx_attendees_directory_filter ON attendees(event_id, business_type, industry, city);

-- GIN indexes for JSONB array containment queries
CREATE INDEX idx_attendees_services_gin ON attendees USING GIN (services);
CREATE INDEX idx_attendees_tags_gin ON attendees USING GIN (tags);

-- Partial index for pending connection requests
CREATE INDEX idx_connections_pending ON connection_requests(event_id, status) WHERE status = 'PENDING';

-- pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes for search
CREATE INDEX idx_attendees_name_trgm ON attendees USING GIN (first_name gin_trgm_ops);
CREATE INDEX idx_attendees_company_trgm ON attendees USING GIN (company gin_trgm_ops);
