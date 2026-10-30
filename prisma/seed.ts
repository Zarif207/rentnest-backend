import bcrypt from "bcryptjs";
import prisma from "../src/lib/prisma.js";
import config from "../src/config/index.js";
import type { PropertyType, UserRole } from "../generated/prisma/client.js";

// Idempotent: safe to run more than once. The admin password is reset on
// every run so the printed credentials always work.

const SALT_ROUNDS = config.bcrypt_salt_rounds;

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@rentnest.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
const DEMO_PASSWORD = "Password@123";

const categories = ["Apartment", "House", "Studio", "Villa"];

const demoUsers: {
  name: string;
  email: string;
  phone: string;
  role: Exclude<UserRole, "ADMIN">;
}[] = [
  {
    name: "Rahim Landlord",
    email: "landlord1@rentnest.com",
    phone: "+12125550101",
    role: "LANDLORD",
  },
  {
    name: "Karim Landlord",
    email: "landlord2@rentnest.com",
    phone: "+15125550102",
    role: "LANDLORD",
  },
  {
    name: "Nadia Tenant",
    email: "tenant1@rentnest.com",
    phone: "+15035550103",
    role: "TENANT",
  },
  {
    name: "Arif Tenant",
    email: "tenant2@rentnest.com",
    phone: "+16195550104",
    role: "TENANT",
  },
];

const demoProperties: {
  ownerEmail: string;
  category: string;
  title: string;
  description: string;
  address: string;
  city: string;
  division: string;
  rentAmount: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  propertyType: PropertyType;
  amenities: string[];
  images: string[];
}[] = [
  {
    ownerEmail: "landlord1@rentnest.com",
    category: "Apartment",
    title: "Modern 3-Bed Apartment in Lincoln Park",
    description:
      "Bright corner apartment with elevator, in-unit laundry and lake views.",
    address: "2350 N Clark St",
    city: "Chicago",
    division: "Illinois",
    rentAmount: 2900,
    bedrooms: 3,
    bathrooms: 2,
    area: 1450,
    propertyType: "APARTMENT",
    amenities: ["wifi", "elevator", "laundry", "parking"],
    images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688"],
  },
  {
    ownerEmail: "landlord1@rentnest.com",
    category: "Studio",
    title: "Furnished Studio near Lady Bird Lake",
    description:
      "Compact furnished studio, ideal for students and young professionals.",
    address: "78 Rainey St",
    city: "Austin",
    division: "Texas",
    rentAmount: 1450,
    bedrooms: 1,
    bathrooms: 1,
    area: 520,
    propertyType: "STUDIO",
    amenities: ["wifi", "furnished", "air-conditioning"],
    images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"],
  },
  {
    ownerEmail: "landlord2@rentnest.com",
    category: "House",
    title: "Craftsman Family House in Portland",
    description:
      "Two-story craftsman with a private garden, porch and garage parking.",
    address: "3412 SE Belmont St",
    city: "Portland",
    division: "Oregon",
    rentAmount: 3100,
    bedrooms: 4,
    bathrooms: 3,
    area: 2400,
    propertyType: "HOUSE",
    amenities: ["parking", "garden", "porch"],
    images: ["https://images.unsplash.com/photo-1568605114967-8130f3a36994"],
  },
  {
    ownerEmail: "landlord2@rentnest.com",
    category: "Villa",
    title: "Oceanview Villa in La Jolla",
    description: "Spacious hillside villa with ocean views and a private pool.",
    address: "7840 Camino Del Oro",
    city: "San Diego",
    division: "California",
    rentAmount: 8500,
    bedrooms: 5,
    bathrooms: 4,
    area: 3800,
    propertyType: "VILLA",
    amenities: ["wifi", "parking", "pool", "garden", "ocean-view"],
    images: ["https://images.unsplash.com/photo-1613490493576-7fde63acd811"],
  },
];

async function main() {
  // Categories
  const categoryIds = new Map<string, string>();
  for (const name of categories) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryIds.set(name, category.id);
  }

  // Admin (password and status reset on every run)
  const adminPassword = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { password: adminPassword, role: "ADMIN", userStatus: "ACTIVE" },
    create: {
      name: "RentNest Admin",
      email: ADMIN_EMAIL,
      password: adminPassword,
      role: "ADMIN",
    },
  });

  // Demo landlords and tenants (left untouched if they already exist)
  const demoPassword = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
  const userIds = new Map<string, string>();
  for (const user of demoUsers) {
    // Demo landlords are always approved, so they can list homes right away.
    const landlordStatus = user.role === "LANDLORD" ? "APPROVED" : null;
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      update: landlordStatus ? { landlordStatus } : {},
      create: { ...user, password: demoPassword, landlordStatus },
    });
    userIds.set(user.email, saved.id);
  }

  // Demo properties (matched by owner + title so re-runs don't duplicate)
  let createdProperties = 0;
  for (const { ownerEmail, category, ...property } of demoProperties) {
    const ownerId = userIds.get(ownerEmail)!;
    const exists = await prisma.property.findFirst({
      where: { ownerId, title: property.title },
      select: { id: true },
    });

    if (!exists) {
      await prisma.property.create({
        data: { ...property, ownerId, categoryId: categoryIds.get(category)! },
      });
      createdProperties++;
    }
  }

  console.log("\n🌱 Seed complete");
  console.log(`   Categories : ${categories.join(", ")}`);
  console.log(
    `   Properties : ${createdProperties} created, ${demoProperties.length - createdProperties} already existed`,
  );
  console.log("\n   Demo users (password: " + DEMO_PASSWORD + ")");
  for (const user of demoUsers)
    console.log(`   - ${user.role.padEnd(8)} ${user.email}`);
  console.log("\n   🔐 Admin credentials");
  console.log(`   Email    : ${ADMIN_EMAIL}`);
  console.log(`   Password : ${ADMIN_PASSWORD}\n`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
