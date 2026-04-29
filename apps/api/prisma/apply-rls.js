const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run(sql, label) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log('  OK:', label);
    return true;
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('  EXISTS:', label);
      return true;
    }
    console.error('  FAIL:', label, '-', e.message.substring(0, 120));
    return false;
  }
}

async function main() {
  console.log('Connecting to Neon...');
  await prisma.$connect();
  console.log('Connected.\n');

  // Enable RLS
  console.log('Enabling Row Level Security...');
  const enables = [
    ['ALTER TABLE events ENABLE ROW LEVEL SECURITY', 'events'],
    ['ALTER TABLE attendees ENABLE ROW LEVEL SECURITY', 'attendees'],
    ['ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY', 'connection_requests'],
    ['ALTER TABLE announcements ENABLE ROW LEVEL SECURITY', 'announcements'],
    ['ALTER TABLE event_field_config ENABLE ROW LEVEL SECURITY', 'event_field_config'],
    ['ALTER TABLE event_rules ENABLE ROW LEVEL SECURITY', 'event_rules'],
    ['ALTER TABLE notifications ENABLE ROW LEVEL SECURITY', 'notifications'],
  ];
  for (const [sql, label] of enables) await run(sql, label);

  // Create policies
  console.log('\nCreating RLS policies...');
  const policies = [
    [`CREATE POLICY organiser_own_events ON events FOR ALL USING (organiser_id = current_setting('app.current_organiser_id', true)::text) WITH CHECK (organiser_id = current_setting('app.current_organiser_id', true)::text)`, 'organiser_own_events'],
    [`CREATE POLICY super_admin_bypass_events ON events FOR ALL USING (current_setting('app.is_super_admin', true)::boolean = true)`, 'super_admin_bypass_events'],
    [`CREATE POLICY public_read_published ON events FOR SELECT USING (status = 'PUBLISHED' AND current_setting('app.current_organiser_id', true) = '')`, 'public_read_published'],
    [`CREATE POLICY event_scoped_attendees ON attendees FOR ALL USING (event_id = current_setting('app.current_event_id', true)::text) WITH CHECK (event_id = current_setting('app.current_event_id', true)::text)`, 'event_scoped_attendees'],
    [`CREATE POLICY super_admin_bypass_attendees ON attendees FOR ALL USING (current_setting('app.is_super_admin', true)::boolean = true)`, 'super_admin_bypass_attendees'],
    [`CREATE POLICY organiser_read_attendees ON attendees FOR SELECT USING (event_id IN (SELECT id FROM events WHERE organiser_id = current_setting('app.current_organiser_id', true)::text))`, 'organiser_read_attendees'],
    [`CREATE POLICY event_scoped_connections ON connection_requests FOR ALL USING (event_id = current_setting('app.current_event_id', true)::text) WITH CHECK (event_id = current_setting('app.current_event_id', true)::text)`, 'event_scoped_connections'],
    [`CREATE POLICY super_admin_bypass_conn ON connection_requests FOR ALL USING (current_setting('app.is_super_admin', true)::boolean = true)`, 'super_admin_bypass_conn'],
    [`CREATE POLICY event_scoped_announce ON announcements FOR ALL USING (event_id = current_setting('app.current_event_id', true)::text) WITH CHECK (event_id = current_setting('app.current_event_id', true)::text)`, 'event_scoped_announce'],
    [`CREATE POLICY super_admin_bypass_ann ON announcements FOR ALL USING (current_setting('app.is_super_admin', true)::boolean = true)`, 'super_admin_bypass_ann'],
    [`CREATE POLICY event_scoped_config ON event_field_config FOR ALL USING (event_id = current_setting('app.current_event_id', true)::text) WITH CHECK (event_id = current_setting('app.current_event_id', true)::text)`, 'event_scoped_config'],
    [`CREATE POLICY super_admin_bypass_cfg ON event_field_config FOR ALL USING (current_setting('app.is_super_admin', true)::boolean = true)`, 'super_admin_bypass_cfg'],
    [`CREATE POLICY event_scoped_rules ON event_rules FOR ALL USING (event_id = current_setting('app.current_event_id', true)::text) WITH CHECK (event_id = current_setting('app.current_event_id', true)::text)`, 'event_scoped_rules'],
    [`CREATE POLICY super_admin_bypass_rules ON event_rules FOR ALL USING (current_setting('app.is_super_admin', true)::boolean = true)`, 'super_admin_bypass_rules'],
    [`CREATE POLICY event_scoped_notif ON notifications FOR ALL USING (event_id = current_setting('app.current_event_id', true)::text)`, 'event_scoped_notif'],
  ];
  for (const [sql, label] of policies) await run(sql, label);

  // Create indexes
  console.log('\nCreating indexes...');
  const indexes = [
    ['CREATE EXTENSION IF NOT EXISTS pg_trgm', 'pg_trgm extension'],
    ['CREATE INDEX IF NOT EXISTS idx_att_directory ON attendees(event_id, business_type, industry, city)', 'directory composite'],
    ['CREATE INDEX IF NOT EXISTS idx_att_services_gin ON attendees USING GIN (services)', 'services GIN'],
    ['CREATE INDEX IF NOT EXISTS idx_att_tags_gin ON attendees USING GIN (tags)', 'tags GIN'],
    ["CREATE INDEX IF NOT EXISTS idx_conn_pending ON connection_requests(event_id, status) WHERE status = 'PENDING'", 'pending connections'],
    ['CREATE INDEX IF NOT EXISTS idx_att_fname_trgm ON attendees USING GIN (first_name gin_trgm_ops)', 'first_name trgm'],
    ['CREATE INDEX IF NOT EXISTS idx_att_company_trgm ON attendees USING GIN (company gin_trgm_ops)', 'company trgm'],
  ];
  for (const [sql, label] of indexes) await run(sql, label);

  console.log('\nRLS policies and indexes applied successfully!');
}

main().catch(e => console.error('FATAL:', e.message)).finally(() => prisma.$disconnect());
