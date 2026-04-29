import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function generateShortHash(): string {
  return crypto.randomBytes(4).toString('hex');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  console.log('Seeding database...\n');

  // ─── 1. Super Admin ───
  const adminPasswordHash = await bcrypt.hash('Admin@2026', 12);
  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: 'admin@vims-enterprise.com' },
    update: {},
    create: {
      email: 'admin@vims-enterprise.com',
      passwordHash: adminPasswordHash,
      name: 'Gowthamraj M',
      mfaEnabled: false,
    },
  });
  console.log('Super Admin created:', superAdmin.email);

  // ─── 2. Test Organiser ───
  const organiserPasswordHash = await bcrypt.hash('Organiser@2026', 12);
  const organiser = await prisma.organiser.upsert({
    where: { email: 'testorganiser@example.com' },
    update: {},
    create: {
      name: 'Priya Sharma',
      organisation: 'TechConnect Events Pvt Ltd',
      email: 'testorganiser@example.com',
      passwordHash: organiserPasswordHash,
      mobile: '+919876543210',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  console.log('Test Organiser created:', organiser.email);

  // ─── 3. Sample Event ───
  const eventSlug = slugify('Bengaluru Tech Summit 2026');
  const shortHash = generateShortHash();
  const startAt = new Date('2026-06-15T09:00:00Z');
  const endAt = new Date('2026-06-15T18:00:00Z');

  const event = await prisma.event.create({
    data: {
      organiserId: organiser.id,
      slug: eventSlug,
      shortHash,
      name: 'Bengaluru Tech Summit 2026',
      description: 'Annual technology networking summit bringing together 200+ tech leaders, startups, and investors from across India.',
      startAt,
      endAt,
      venue: 'NIMHANS Convention Centre, Bengaluru',
      venueMapUrl: 'https://maps.google.com/?q=NIMHANS+Convention+Centre+Bengaluru',
      expectedCount: 200,
      brandPrimary: '#2563EB',
      brandSecondary: '#60A5FA',
      status: 'PUBLISHED',
      qrUrl: `https://app.vims-events.com/e/${eventSlug}-${shortHash}`,
    },
  });
  console.log('Sample Event created:', event.name);
  console.log('  QR URL:', event.qrUrl);

  // ─── 4. Event Field Config ───
  const fieldKeys = [
    { key: 'firstName', required: true },
    { key: 'lastName', required: true },
    { key: 'email', required: true },
    { key: 'phone', required: true },
    { key: 'designation', required: true },
    { key: 'company', required: true },
    { key: 'businessType', required: true },
    { key: 'industry', required: true },
    { key: 'services', required: true },
    { key: 'city', required: true },
    { key: 'address', required: false },
    { key: 'companySize', required: false },
    { key: 'tags', required: false },
    { key: 'profilePhotoUrl', required: false },
    { key: 'companyLogoUrl', required: false },
  ];

  for (const field of fieldKeys) {
    await prisma.eventFieldConfig.create({
      data: {
        eventId: event.id,
        fieldKey: field.key,
        isRequired: field.required,
        isVisible: true,
      },
    });
  }
  console.log('Event field config created:', fieldKeys.length, 'fields');

  // ─── 5. Event Rules ───
  await prisma.eventRule.create({
    data: {
      eventId: event.id,
      maxConnectionsPerAttendee: null,
      showAddressAfterAccept: true,
      allowVcardDownload: true,
    },
  });
  console.log('Event rules created');

  // ─── 6. Sample Attendees ───
  const sampleAttendees = [
    {
      firstName: 'Rahul', lastName: 'Krishnan',
      email: 'rahul.krishnan@gmail.com', phone: '+919988776655',
      designation: 'CTO', company: 'CloudNine Solutions',
      businessType: 'Technology', industry: 'IT Services',
      services: ['Cloud Infrastructure', 'DevOps Consulting', 'SaaS Development'],
      city: 'Bengaluru', companySize: '51-200',
      tags: ['cloud', 'devops', 'kubernetes'],
    },
    {
      firstName: 'Meena', lastName: 'Rajendran',
      email: 'meena.r@startupfund.io', phone: '+919876512340',
      designation: 'Managing Partner', company: 'StartupFund Ventures',
      businessType: 'Finance', industry: 'FinTech',
      services: ['Seed Funding', 'Series A Advisory', 'Startup Mentorship'],
      city: 'Chennai', companySize: '11-50',
      tags: ['venture-capital', 'startups', 'fintech'],
    },
    {
      firstName: 'Arun', lastName: 'Nair',
      email: 'arun@healthbridge.in', phone: '+919445566778',
      designation: 'Head of Partnerships', company: 'HealthBridge India',
      businessType: 'Healthcare', industry: 'HealthTech',
      services: ['Telemedicine', 'Hospital Management', 'Health Data Analytics'],
      city: 'Bengaluru', companySize: '201-500',
      tags: ['healthcare', 'telemedicine', 'ai'],
    },
    {
      firstName: 'Deepa', lastName: 'Subramanian',
      email: 'deepa.s@edulearn.co', phone: '+919977665544',
      designation: 'Product Director', company: 'EduLearn Technologies',
      businessType: 'Education', industry: 'EdTech',
      services: ['LMS Development', 'Content Authoring', 'Analytics Dashboards'],
      city: 'Bengaluru', companySize: '51-200',
      tags: ['education', 'edtech', 'e-learning'],
    },
    {
      firstName: 'Vikram', lastName: 'Patel',
      email: 'vikram@greenlogistics.com', phone: '+919887766554',
      designation: 'CEO', company: 'GreenLogistics India',
      businessType: 'Logistics', industry: 'Logistics',
      services: ['Last-Mile Delivery', 'Supply Chain Optimization', 'Cold Chain Logistics'],
      city: 'Mumbai', companySize: '500+',
      tags: ['logistics', 'supply-chain', 'sustainability'],
    },
  ];

  const attendeeRecords = [];
  for (const data of sampleAttendees) {
    const attendee = await prisma.attendee.create({
      data: {
        eventId: event.id,
        ...data,
        services: data.services as any,
        tags: data.tags as any,
        consentGiven: true,
        consentedAt: new Date(),
      },
    });
    attendeeRecords.push(attendee);
    console.log('  Attendee:', attendee.firstName, attendee.lastName, '-', attendee.company);
  }

  // ─── 7. Sample Connection Requests ───
  // Rahul sends request to Meena (ACCEPTED)
  await prisma.connectionRequest.create({
    data: {
      eventId: event.id,
      senderId: attendeeRecords[0].id,
      receiverId: attendeeRecords[1].id,
      status: 'ACCEPTED',
      message: 'Would love to discuss funding opportunities for our cloud platform.',
      respondedAt: new Date(),
    },
  });

  // Rahul sends request to Arun (PENDING)
  await prisma.connectionRequest.create({
    data: {
      eventId: event.id,
      senderId: attendeeRecords[0].id,
      receiverId: attendeeRecords[2].id,
      status: 'PENDING',
      message: 'Interested in exploring telemedicine integrations.',
    },
  });

  // Deepa sends request to Rahul (PENDING)
  await prisma.connectionRequest.create({
    data: {
      eventId: event.id,
      senderId: attendeeRecords[3].id,
      receiverId: attendeeRecords[0].id,
      status: 'PENDING',
      message: 'Looking for cloud infrastructure partners for our LMS platform.',
    },
  });

  console.log('\nSample connections created: 1 accepted, 2 pending');

  // ─── 8. Sample Announcement ───
  await prisma.announcement.create({
    data: {
      eventId: event.id,
      organiserId: organiser.id,
      title: 'Welcome to Bengaluru Tech Summit 2026!',
      body: 'Registration is now open. Visit the welcome desk for your event badge. Networking sessions begin at 10:30 AM in Hall A.',
      recipientCount: sampleAttendees.length,
    },
  });
  console.log('Sample announcement created');

  // ─── Summary ───
  console.log('\n══════════════════════════════════════════');
  console.log('  SEED COMPLETE');
  console.log('══════════════════════════════════════════');
  console.log(`  Super Admin: admin@vims-enterprise.com / Admin@2026`);
  console.log(`  Organiser:   testorganiser@example.com / Organiser@2026`);
  console.log(`  Event:       ${event.name}`);
  console.log(`  Event Slug:  ${event.slug}`);
  console.log(`  Short Hash:  ${event.shortHash}`);
  console.log(`  Attendees:   ${attendeeRecords.length}`);
  console.log('══════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
