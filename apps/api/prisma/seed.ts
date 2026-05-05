import { PrismaClient, EventStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function shortHash(): string { return crypto.randomBytes(4).toString('hex'); }
function slugify(t: string): string { return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function uuid(): string { return crypto.randomUUID(); }

const FIELD_KEYS = [
  { key: 'firstName', required: true }, { key: 'lastName', required: true },
  { key: 'email', required: true },     { key: 'phone', required: true },
  { key: 'designation', required: true },{ key: 'company', required: true },
  { key: 'businessType', required: true },{ key: 'industry', required: true },
  { key: 'services', required: false },  { key: 'city', required: true },
  { key: 'address', required: false },   { key: 'companySize', required: false },
  { key: 'tags', required: false },      { key: 'profilePhotoUrl', required: false },
  { key: 'companyLogoUrl', required: false },
];

async function upsertFieldConfigs(eventId: string) {
  for (const f of FIELD_KEYS) {
    await prisma.eventFieldConfig.upsert({
      where: { eventId_fieldKey: { eventId, fieldKey: f.key } },
      update: {},
      create: { eventId, fieldKey: f.key, isRequired: f.required, isVisible: true },
    });
  }
}

async function upsertEventRule(eventId: string) {
  await prisma.eventRule.upsert({
    where: { eventId },
    update: {},
    create: { eventId, maxConnectionsPerAttendee: null, showAddressAfterAccept: true, allowVcardDownload: true },
  });
}

async function main() {
  console.log('Seeding database…\n');

  // ─── 1. Super Admin ───────────────────────────────────────────────────
  // Super-admin credentials are NOT seeded by this file. They are managed
  // explicitly via the `db:set-super-admin` script (see prisma/set-super-admin.ts)
  // so credentials never live in committed code. If no super admin exists,
  // run:  SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... npm run db:set-super-admin
  const existingAdmins = await prisma.superAdmin.count();
  console.log(`Super admins in DB: ${existingAdmins} (managed via db:set-super-admin)`);

  // ─── 2. Two Test Organisers ───────────────────────────────────────────
  const orgHash = await bcrypt.hash('Organiser@2026', 12);
  const organiser = await prisma.organiser.upsert({
    where: { email: 'testorganiser@example.com' },
    update: {},
    create: {
      name: 'Priya Sharma', organisation: 'TechConnect Events Pvt Ltd',
      email: 'testorganiser@example.com', passwordHash: orgHash,
      mobile: '+919876543210', status: 'ACTIVE', emailVerifiedAt: new Date(),
    },
  });

  const org2Hash = await bcrypt.hash('Organiser@2026', 12);
  const organiser2 = await prisma.organiser.upsert({
    where: { email: 'rahul.events@startupfund.io' },
    update: {},
    create: {
      name: 'Rahul Krishnan', organisation: 'StartupFund Ventures',
      email: 'rahul.events@startupfund.io', passwordHash: org2Hash,
      mobile: '+919876512340', status: 'ACTIVE', emailVerifiedAt: new Date(),
    },
  });
  console.log('Organisers:', organiser.email, '|', organiser2.email);

  const FRONTEND = process.env.FRONTEND_URL ?? 'http://localhost:3000';

  // ─── Helper: create event if slug not exists ──────────────────────────
  async function createEvent(data: {
    organiserId: string; name: string; description: string;
    startAt: Date; endAt: Date; venue: string; venueMapUrl: string;
    expectedCount: number; brandPrimary: string; brandSecondary: string;
    status: EventStatus;
  }) {
    const slug = slugify(data.name);
    const existing = await prisma.event.findUnique({ where: { slug } });
    if (existing) { console.log('  Event exists:', data.name); return existing; }
    const hash = shortHash();
    const joinUrl = `${FRONTEND}/auth/attendee/register?eventId=PLACEHOLDER&eventName=${encodeURIComponent(data.name)}`;
    const event = await prisma.event.create({
      data: {
        organiserId: data.organiserId,
        name: data.name, description: data.description,
        startAt: data.startAt, endAt: data.endAt,
        venue: data.venue, venueMapUrl: data.venueMapUrl,
        expectedCount: data.expectedCount,
        brandPrimary: data.brandPrimary, brandSecondary: data.brandSecondary,
        slug, shortHash: hash,
        status: data.status,
        qrUrl: joinUrl,
      },
    });
    // Fix qrUrl with real eventId
    await prisma.event.update({
      where: { id: event.id },
      data: { qrUrl: `${FRONTEND}/auth/attendee/register?eventId=${event.id}&eventName=${encodeURIComponent(data.name)}` },
    });
    await upsertFieldConfigs(event.id);
    await upsertEventRule(event.id);
    console.log('  Created event:', data.name);
    return event;
  }

  // ─── 3. Five Events ───────────────────────────────────────────────────
  const event1 = await createEvent({
    organiserId: organiser.id,
    name: 'Bengaluru Tech Summit 2026',
    description: 'Annual technology networking summit bringing together 200+ tech leaders, startups, and investors across India.',
    startAt: new Date('2026-06-15T09:00:00Z'), endAt: new Date('2026-06-15T18:00:00Z'),
    venue: 'NIMHANS Convention Centre, Bengaluru', venueMapUrl: 'https://maps.google.com/?q=NIMHANS+Bengaluru',
    expectedCount: 200, brandPrimary: '#2563EB', brandSecondary: '#60A5FA',
    status: EventStatus.PUBLISHED,
  });

  const event2 = await createEvent({
    organiserId: organiser.id,
    name: 'IndiaTech Forum Chennai 2026',
    description: "South India's largest tech networking event - connecting founders, engineers, and investors.",
    startAt: new Date('2026-07-22T09:00:00Z'), endAt: new Date('2026-07-22T17:00:00Z'),
    venue: 'ITC Grand Chola, Chennai', venueMapUrl: 'https://maps.google.com/?q=ITC+Grand+Chola+Chennai',
    expectedCount: 150, brandPrimary: '#7C3AED', brandSecondary: '#C4B5FD',
    status: EventStatus.PUBLISHED,
  });

  const event3 = await createEvent({
    organiserId: organiser.id,
    name: 'Women in Tech India Summit',
    description: 'Celebrating and empowering women in technology across India with keynotes, workshops, and networking.',
    startAt: new Date('2026-08-10T10:00:00Z'), endAt: new Date('2026-08-10T17:00:00Z'),
    venue: 'Taj Lands End, Mumbai', venueMapUrl: 'https://maps.google.com/?q=Taj+Lands+End+Mumbai',
    expectedCount: 100, brandPrimary: '#DB2777', brandSecondary: '#F9A8D4',
    status: EventStatus.DRAFT,
  });

  const event4 = await createEvent({
    organiserId: organiser2.id,
    name: 'Startup Grind India 2026',
    description: 'The global startup community in India — fireside chats, pitch competitions, and startup networking.',
    startAt: new Date('2026-09-05T09:00:00Z'), endAt: new Date('2026-09-05T18:00:00Z'),
    venue: 'Google Campus, Hyderabad', venueMapUrl: 'https://maps.google.com/?q=Google+Campus+Hyderabad',
    expectedCount: 300, brandPrimary: '#059669', brandSecondary: '#6EE7B7',
    status: EventStatus.PUBLISHED,
  });

  const event5 = await createEvent({
    organiserId: organiser2.id,
    name: 'FinTech Innovation Summit 2026',
    description: 'Where finance meets technology — payments, lending, wealth management, and regulatory discussions.',
    startAt: new Date('2026-10-18T09:00:00Z'), endAt: new Date('2026-10-18T17:00:00Z'),
    venue: 'Bombay Stock Exchange, Mumbai', venueMapUrl: 'https://maps.google.com/?q=BSE+Mumbai',
    expectedCount: 250, brandPrimary: '#D97706', brandSecondary: '#FCD34D',
    status: EventStatus.PUBLISHED,
  });

  // ─── 4. Attendees (5 per published event) ─────────────────────────────
  const ATTENDEE_POOL = [
    { firstName: 'Rahul',    lastName: 'Krishnan',    email: 'rahul.krishnan@gmail.com',     phone: '+919988776655', designation: 'CTO',                  company: 'CloudNine Solutions',    businessType: 'Technology', industry: 'IT Services',    services: ['Cloud Infrastructure', 'DevOps', 'SaaS'],    city: 'Bengaluru',  companySize: '51-200',  tags: ['cloud', 'devops'] },
    { firstName: 'Meena',    lastName: 'Rajendran',   email: 'meena.r@startupfund.io',       phone: '+919876512340', designation: 'Managing Partner',      company: 'StartupFund Ventures',   businessType: 'Finance',    industry: 'FinTech',        services: ['Seed Funding', 'Series A Advisory'],          city: 'Chennai',    companySize: '11-50',   tags: ['vc', 'fintech'] },
    { firstName: 'Arun',     lastName: 'Nair',        email: 'arun@healthbridge.in',         phone: '+919445566778', designation: 'Head of Partnerships', company: 'HealthBridge India',     businessType: 'Healthcare', industry: 'HealthTech',     services: ['Telemedicine', 'Health Analytics'],           city: 'Bengaluru',  companySize: '201-500', tags: ['health', 'ai'] },
    { firstName: 'Deepa',    lastName: 'Subramanian', email: 'deepa.s@edulearn.co',         phone: '+919977665544', designation: 'Product Director',      company: 'EduLearn Technologies',  businessType: 'Education',  industry: 'EdTech',         services: ['LMS', 'Content Authoring'],                   city: 'Bengaluru',  companySize: '51-200',  tags: ['edtech', 'learning'] },
    { firstName: 'Vikram',   lastName: 'Patel',       email: 'vikram@greenlogistics.com',    phone: '+919887766554', designation: 'CEO',                  company: 'GreenLogistics India',   businessType: 'Logistics',  industry: 'Logistics',      services: ['Last-Mile Delivery', 'Cold Chain'],           city: 'Mumbai',     companySize: '500+',    tags: ['logistics', 'sustainability'] },
    { firstName: 'Preethi',  lastName: 'Venkatesh',   email: 'preethi@techspark.io',         phone: '+919123456789', designation: 'Founder & CEO',        company: 'TechSpark Labs',         businessType: 'Technology', industry: 'AI/ML',          services: ['AI Consulting', 'ML Models', 'NLP'],          city: 'Hyderabad',  companySize: '11-50',   tags: ['ai', 'ml', 'nlp'] },
    { firstName: 'Karthik',  lastName: 'Rajan',       email: 'karthik.r@paynova.in',        phone: '+919234567890', designation: 'VP Engineering',        company: 'PayNova India',          businessType: 'Finance',    industry: 'FinTech',        services: ['Payment Gateway', 'UPI Integration'],        city: 'Mumbai',     companySize: '51-200',  tags: ['payments', 'upi'] },
    { firstName: 'Ananya',   lastName: 'Gupta',       email: 'ananya@designcraft.studio',   phone: '+919345678901', designation: 'Creative Director',     company: 'DesignCraft Studio',    businessType: 'Creative',   industry: 'Design',         services: ['UI/UX Design', 'Brand Identity'],             city: 'Pune',       companySize: '11-50',   tags: ['design', 'ux', 'branding'] },
    { firstName: 'Siddharth',lastName: 'Malhotra',    email: 'siddharth@growthx.in',        phone: '+919456789012', designation: 'Growth Lead',           company: 'GrowthX Ventures',      businessType: 'Consulting', industry: 'Marketing',      services: ['Growth Hacking', 'Performance Marketing'],   city: 'Delhi',      companySize: '11-50',   tags: ['growth', 'marketing'] },
    { firstName: 'Nithya',   lastName: 'Balakrishnan',email: 'nithya@legalease.co.in',       phone: '+919567890123', designation: 'Legal Tech Founder',    company: 'LegalEase Solutions',   businessType: 'Legal',      industry: 'LegalTech',      services: ['Contract Review', 'Compliance AI'],           city: 'Chennai',    companySize: '11-50',   tags: ['legal', 'ai', 'compliance'] },
  ];

  async function seedAttendees(event: { id: string }, pool: typeof ATTENDEE_POOL) {
    const records = [];
    for (const d of pool) {
      const att = await prisma.attendee.upsert({
        where: { eventId_email: { eventId: event.id, email: d.email } },
        update: {},
        create: {
          eventId: event.id, ...d,
          services: d.services as unknown as never,
          tags: d.tags as unknown as never,
          consentGiven: true, consentedAt: new Date(),
        },
      });
      records.push(att);
    }
    return records;
  }

  const att1 = await seedAttendees(event1, ATTENDEE_POOL.slice(0, 5));
  const att2 = await seedAttendees(event2, ATTENDEE_POOL.slice(2, 7));
  const att4 = await seedAttendees(event4, ATTENDEE_POOL.slice(4, 9));
  const att5 = await seedAttendees(event5, ATTENDEE_POOL.slice(5, 10));
  console.log(`Attendees seeded: e1=${att1.length}, e2=${att2.length}, e4=${att4.length}, e5=${att5.length}`);

  // ─── 5. Connections per event ─────────────────────────────────────────
  async function seedConnections(eventId: string, recs: { id: string }[]) {
    const pairs: [number, number, 'ACCEPTED' | 'PENDING'][] = [
      [0, 1, 'ACCEPTED'], [0, 2, 'ACCEPTED'], [1, 2, 'ACCEPTED'],
      [2, 3, 'PENDING'],  [3, 4, 'ACCEPTED'], [1, 4, 'PENDING'],
    ];
    for (const [si, ri, status] of pairs) {
      if (!recs[si] || !recs[ri]) continue;
      const existing = await prisma.connectionRequest.findFirst({
        where: { eventId, senderId: recs[si].id, receiverId: recs[ri].id },
      });
      if (!existing) {
        await prisma.connectionRequest.create({
          data: {
            eventId,
            senderId: recs[si].id,
            receiverId: recs[ri].id,
            status,
            message: 'Would love to connect and explore synergies!',
            ...(status === 'ACCEPTED' ? { respondedAt: new Date() } : {}),
          },
        });
      }
    }
  }

  await seedConnections(event1.id, att1);
  await seedConnections(event2.id, att2);
  await seedConnections(event4.id, att4);
  await seedConnections(event5.id, att5);
  console.log('Connections seeded');

  // ─── 6. Announcements ────────────────────────────────────────────────
  const announcements = [
    { eventId: event1.id, organiserId: organiser.id, title: 'Welcome to Bengaluru Tech Summit 2026!', body: 'Registration open. Networking sessions start at 10:30 AM in Hall A. Please pick up your badge at the welcome desk.' },
    { eventId: event1.id, organiserId: organiser.id, title: 'Lunch Break — Hall B', body: 'Lunch is served in Hall B from 1 PM to 2 PM. Networking tables have industry tags for easy discovery!' },
    { eventId: event2.id, organiserId: organiser.id, title: 'IndiaTech Forum — Doors Open!', body: 'Welcome to Chennai. The venue map is available in the app. First keynote starts in 30 minutes.' },
    { eventId: event4.id, organiserId: organiser2.id, title: 'Pitch Competition at 3 PM', body: 'Join the startup pitch competition in the main auditorium. 8 finalists competing for funding.' },
    { eventId: event5.id, organiserId: organiser2.id, title: 'FinTech Summit — Opening Remarks', body: 'Welcome all participants. RBI representatives will join us for the regulatory roundtable at 2 PM.' },
  ];

  for (const ann of announcements) {
    const existing = await prisma.announcement.findFirst({ where: { eventId: ann.eventId, title: ann.title } });
    if (!existing) {
      await prisma.announcement.create({ data: { ...ann, recipientCount: 5 } });
    }
  }
  console.log('Announcements seeded');

  // ─── Summary ──────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  SEED COMPLETE');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  Super Admin:  managed via db:set-super-admin (not seeded)`);
  console.log(`  Organiser 1:  testorganiser@example.com / Organiser@2026`);
  console.log(`  Organiser 2:  rahul.events@startupfund.io / Organiser@2026`);
  console.log(`  Events:       5 (3 by org1, 2 by org2)`);
  console.log(`  Attendees:    10 unique profiles across ${att1.length + att2.length + att4.length + att5.length} registrations`);
  console.log('══════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
