/* eslint-disable no-console */
import { PrismaClient, Role, BookingStatus, UserStatus, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Mirrors src/lib/data.ts from the Phase 10 frontend so the seeded API
// returns results that match what the UI was designed against.
const categories = [
  { slug: "ac-repair", name: "AC Repair", icon: "❄️" },
  { slug: "electrical", name: "Electrical", icon: "🔌" },
  { slug: "plumbing", name: "Plumbing", icon: "🔧" },
  { slug: "pc-repair", name: "Laptop/PC Repair", icon: "💻" },
  { slug: "cleaning", name: "Home Cleaning", icon: "🧽" },
  { slug: "painting", name: "Painting", icon: "🎨" },
  { slug: "cctv", name: "CCTV Install", icon: "📷" },
  { slug: "appliance", name: "Appliance Repair", icon: "🧰" },
  { slug: "moving", name: "Moving", icon: "📦" },
];

const providerSeeds = [
  {
    email: "karim@fixmate.dev",
    businessName: "Karim Electricals",
    avatarInitial: "K",
    categorySlug: "electrical",
    location: "Mirpur, Dhaka",
    yearsActive: 6,
    verified: true,
    bio: "Licensed electrical contractor covering residential wiring, breaker upgrades, and safety inspections across Dhaka.",
    rating: 4.8,
    reviewCount: 212,
    jobsCompleted: 486,
    responseTime: "Under 1 hour",
    serviceAreas: ["Mirpur", "Pallabi", "Kazipara", "Shewrapara"],
    service: {
      slug: "home-wiring-inspection",
      title: "Home Wiring Safety Inspection",
      shortDescription: "Full circuit inspection with a written safety report.",
      description:
        "A certified electrician inspects your home's wiring, breaker load, and earthing, then hands you a written report flagging any fire or shock risks.",
      price: 900,
      priceUnit: "visit" as const,
      features: ["Full circuit & breaker check", "Earthing verification", "Written safety report", "Same-day minor fixes"],
    },
  },
  {
    email: "coolfix@fixmate.dev",
    businessName: "CoolFix AC Service",
    avatarInitial: "C",
    categorySlug: "ac-repair",
    location: "Dhanmondi, Dhaka",
    yearsActive: 4,
    verified: true,
    bio: "AC installation, servicing, and gas refill specialists. Genuine parts carried on every visit.",
    rating: 4.7,
    reviewCount: 164,
    jobsCompleted: 351,
    responseTime: "Under 2 hours",
    serviceAreas: ["Dhanmondi", "Mohammadpur", "Jigatola", "Kalabagan"],
    service: {
      slug: "split-ac-full-service",
      title: "Split AC Full Service & Gas Refill",
      shortDescription: "Deep clean, gas check, and cooling diagnostics for split ACs.",
      description:
        "A complete service visit covering filter and coil cleaning, drainage check, gas pressure diagnostics, and a cooling performance test.",
      price: 1200,
      priceUnit: "visit" as const,
      features: ["Filter & coil deep cleaning", "Gas pressure diagnostics", "Drainage line check", "30-day service warranty"],
    },
  },
  {
    email: "rafiq@fixmate.dev",
    businessName: "Rafiq Plumbing Co.",
    avatarInitial: "R",
    categorySlug: "plumbing",
    location: "Uttara, Dhaka",
    yearsActive: 8,
    verified: true,
    bio: "Eight years fixing leaks, clogs, and low pressure across Uttara and nearby sectors.",
    rating: 4.6,
    reviewCount: 98,
    jobsCompleted: 512,
    responseTime: "Same day",
    serviceAreas: ["Uttara", "Airport", "Turag", "Tongi"],
    service: {
      slug: "blocked-drain-fix",
      title: "Blocked Drain & Pipe Leak Fix",
      shortDescription: "Same-day fix for clogs, leaks, and low water pressure.",
      description:
        "Diagnoses and clears blocked drains, patches leaking joints, and restores normal water pressure — most jobs completed within a single visit.",
      price: 700,
      priceUnit: "visit" as const,
      features: ["Drain camera diagnostics", "Leak sealing & pipe patching", "Pressure restoration", "Parts under separate quote"],
    },
  },
  {
    email: "byteworks@fixmate.dev",
    businessName: "ByteWorks PC Care",
    avatarInitial: "B",
    categorySlug: "pc-repair",
    location: "Banani, Dhaka",
    yearsActive: 3,
    verified: false,
    bio: "Laptop and desktop repair — screens, batteries, data recovery, and OS troubleshooting.",
    rating: 4.9,
    reviewCount: 71,
    jobsCompleted: 143,
    responseTime: "Under 3 hours",
    serviceAreas: ["Banani", "Gulshan", "Niketon", "Baridhara"],
    service: {
      slug: "laptop-screen-replacement",
      title: "Laptop Screen & Battery Replacement",
      shortDescription: "Genuine-part replacement with a 6-month warranty.",
      description:
        "Replaces cracked laptop screens and worn-out batteries using genuine or OEM-equivalent parts, with same-day turnaround for most models.",
      price: 3500,
      priceUnit: "job" as const,
      available: false,
      features: ["Genuine / OEM parts", "Same-day turnaround", "Free diagnostics", "6-month warranty"],
    },
  },
  {
    email: "shinehome@fixmate.dev",
    businessName: "ShineHome Cleaning",
    avatarInitial: "S",
    categorySlug: "cleaning",
    location: "Gulshan, Dhaka",
    yearsActive: 5,
    verified: true,
    bio: "Two- and three-person cleaning teams for full-home deep cleans and recurring housekeeping.",
    rating: 4.5,
    reviewCount: 340,
    jobsCompleted: 728,
    responseTime: "Under 4 hours",
    serviceAreas: ["Gulshan", "Banani", "Baridhara", "Bashundhara"],
    service: {
      slug: "deep-home-cleaning",
      title: "Deep Home Cleaning (2BR/2BA)",
      shortDescription: "Kitchen, bathrooms, floors, and window tracks — all covered.",
      description:
        "A thorough top-to-bottom clean for a 2-bedroom, 2-bath home, including kitchen degreasing, bathroom sanitation, floor scrubbing, and window track cleaning.",
      price: 2400,
      priceUnit: "job" as const,
      features: ["2-person cleaning team", "Eco-friendly products", "Kitchen deep degreasing", "Window track cleaning"],
    },
  },
  {
    email: "momen@fixmate.dev",
    businessName: "Momen Paint Studio",
    avatarInitial: "M",
    categorySlug: "painting",
    location: "Mohammadpur, Dhaka",
    yearsActive: 7,
    verified: false,
    bio: "Interior and exterior painting with proper surface prep — crack filling, priming, and clean-edge masking.",
    rating: 4.4,
    reviewCount: 58,
    jobsCompleted: 189,
    responseTime: "Same day",
    serviceAreas: ["Mohammadpur", "Shyamoli", "Adabor", "Dhanmondi"],
    service: null,
  },
];

async function main() {
  console.log("🌱 Seeding FixMate database...");

  const defaultPasswordHash = await bcrypt.hash("Password123", 10);

  // Admin
  await prisma.user.upsert({
    where: { email: "admin@fixmate.dev" },
    update: {},
    create: {
      name: "FixMate Admin",
      email: "admin@fixmate.dev",
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
      isVerifiedEmail: true,
    },
  });

  // Sample customer
  await prisma.user.upsert({
    where: { email: "customer@fixmate.dev" },
    update: {},
    create: {
      name: "Nusrat Jahan",
      email: "customer@fixmate.dev",
      passwordHash: defaultPasswordHash,
      role: Role.CUSTOMER,
      phone: "+8801711000000",
      address: "House 12, Road 5, Dhanmondi, Dhaka",
      isVerifiedEmail: true,
    },
  });

  // A second demo customer, pre-suspended — gives the admin dashboard's
  // Users tab a non-trivial "Suspended" row to show out of the box (Part 6).
  await prisma.user.upsert({
    where: { email: "omar.suspended@fixmate.dev" },
    update: {},
    create: {
      name: "Omar Faruk",
      email: "omar.suspended@fixmate.dev",
      passwordHash: defaultPasswordHash,
      role: Role.CUSTOMER,
      status: UserStatus.SUSPENDED,
      isVerifiedEmail: true,
    },
  });

  // Categories
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon },
      create: { ...cat, count: 0 },
    });
  }

  // Providers (+ one flagship service each, where defined)
  for (const p of providerSeeds) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        name: p.businessName,
        email: p.email,
        passwordHash: defaultPasswordHash,
        role: Role.PROVIDER,
        isVerifiedEmail: true,
      },
    });

    const profile = await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        businessName: p.businessName,
        avatarInitial: p.avatarInitial,
        categorySlug: p.categorySlug,
        location: p.location,
        bio: p.bio,
        yearsActive: p.yearsActive,
        verified: p.verified,
        jobsCompleted: p.jobsCompleted,
        responseTime: p.responseTime,
        serviceAreas: p.serviceAreas,
        rating: p.rating,
        reviewCount: p.reviewCount,
      },
    });

    if (p.service) {
      await prisma.service.upsert({
        where: { slug: p.service.slug },
        update: {},
        create: {
          slug: p.service.slug,
          title: p.service.title,
          categorySlug: p.categorySlug,
          shortDescription: p.service.shortDescription,
          description: p.service.description,
          price: p.service.price,
          priceUnit: p.service.priceUnit,
          location: p.location,
          available: p.service.available ?? true,
          features: p.service.features,
          providerId: profile.id,
          rating: p.rating,
          reviewCount: p.reviewCount,
        },
      });
    }
  }

  // Refresh denormalized category counts from actual service rows.
  for (const cat of categories) {
    const count = await prisma.service.count({ where: { categorySlug: cat.slug } });
    await prisma.category.update({ where: { slug: cat.slug }, data: { count } });
  }

  // Demo bookings — a handful of statuses across a couple of providers so
  // Part 4's endpoints (GET /bookings/mine, /bookings/provider, status
  // transitions) return something meaningful without any manual clicking.
  const demoCustomer = await prisma.user.findUniqueOrThrow({ where: { email: "customer@fixmate.dev" } });
  const acService = await prisma.service.findUnique({ where: { slug: "split-ac-full-service" } });
  const wiringService = await prisma.service.findUnique({ where: { slug: "home-wiring-inspection" } });
  const cleaningService = await prisma.service.findUnique({ where: { slug: "deep-home-cleaning" } });

  const demoBookings = [
    acService && {
      id: "demo-bk-pending",
      serviceId: acService.id,
      status: BookingStatus.PENDING,
      date: new Date("2026-08-20T00:00:00.000Z"),
      time: "10:00 AM",
      address: "House 14, Road 7, Dhanmondi, Dhaka",
      amount: acService.price,
      history: [{ status: "Pending", at: "2026-08-10T09:12:00.000Z", note: "Booking submitted" }],
    },
    wiringService && {
      id: "demo-bk-completed",
      serviceId: wiringService.id,
      status: BookingStatus.COMPLETED,
      date: new Date("2026-08-02T00:00:00.000Z"),
      time: "3:30 PM",
      address: "House 22, Road 3, Mirpur, Dhaka",
      amount: wiringService.price,
      reviewed: false,
      history: [
        { status: "Pending", at: "2026-07-28T07:05:00.000Z", note: "Booking submitted" },
        { status: "Accepted", at: "2026-07-28T10:15:00.000Z", note: "Confirmed by provider" },
        { status: "In Progress", at: "2026-08-02T15:32:00.000Z", note: "Technician on site" },
        { status: "Completed", at: "2026-08-02T17:10:00.000Z", note: "Job marked complete" },
      ],
    },
    cleaningService && {
      id: "demo-bk-cancelled",
      serviceId: cleaningService.id,
      status: BookingStatus.CANCELLED,
      date: new Date("2026-07-10T00:00:00.000Z"),
      time: "9:00 AM",
      address: "Apt 4B, Road 11, Gulshan, Dhaka",
      amount: cleaningService.price,
      history: [
        { status: "Pending", at: "2026-07-06T08:30:00.000Z", note: "Booking submitted" },
        { status: "Cancelled", at: "2026-07-08T10:00:00.000Z", note: "Cancelled by customer — schedule conflict" },
      ],
    },
    acService && {
      id: "demo-bk-completed-reviewed",
      serviceId: acService.id,
      status: BookingStatus.COMPLETED,
      date: new Date("2026-07-15T00:00:00.000Z"),
      time: "4:00 PM",
      address: "House 2, Road 5, Mohammadpur, Dhaka",
      amount: acService.price,
      reviewed: true,
      history: [
        { status: "Pending", at: "2026-07-10T05:40:00.000Z", note: "Booking submitted" },
        { status: "Accepted", at: "2026-07-10T09:00:00.000Z", note: "Confirmed by provider" },
        { status: "In Progress", at: "2026-07-15T16:10:00.000Z", note: "Technician on site" },
        { status: "Completed", at: "2026-07-15T18:00:00.000Z", note: "Job marked complete" },
      ],
    },
  ].filter(Boolean) as {
    id: string;
    serviceId: string;
    status: BookingStatus;
    date: Date;
    time: string;
    address: string;
    amount: Prisma.Decimal | number;
    reviewed?: boolean;
    history: Record<string, unknown>[];
  }[];

  for (const b of demoBookings) {
    await prisma.booking.upsert({
      where: { id: b.id },
      update: {},
      create: {
        id: b.id,
        serviceId: b.serviceId,
        customerId: demoCustomer.id,
        status: b.status,
        date: b.date,
        time: b.time,
        address: b.address,
        amount: b.amount,
        reviewed: b.reviewed ?? false,
        history: b.history as Prisma.InputJsonValue,
      },
    });
  }

  // Demo review — tied to "demo-bk-completed-reviewed" above. Deliberately
  // NOT blended into Service/ProviderProfile.rating/reviewCount: those
  // already represent the full seed-era aggregate history (see the comment
  // on `blendRating` in the frontend's src/lib/data.ts), and this one row
  // is just an example of it, not an addition to it. A review created
  // through `POST /reviews` after this point *does* get blended in — see
  // `createReview` in src/services/review.service.ts.
  if (acService) {
    await prisma.review.upsert({
      where: { bookingId: "demo-bk-completed-reviewed" },
      update: {},
      create: {
        bookingId: "demo-bk-completed-reviewed",
        serviceId: acService.id,
        customerId: demoCustomer.id,
        rating: 5,
        comment: "Cooling was noticeably better the same evening. Technician explained everything clearly.",
      },
    });
  }

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
