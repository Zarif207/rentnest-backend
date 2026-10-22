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
    phone: "01710000001",
    role: "LANDLORD",
  },
  {
    name: "Karim Landlord",
    email: "landlord2@rentnest.com",
    phone: "01710000002",
    role: "LANDLORD",
  },
  {
    name: "Nadia Tenant",
    email: "tenant1@rentnest.com",
    phone: "01810000001",
    role: "TENANT",
  },
  {
    name: "Arif Tenant",
    email: "tenant2@rentnest.com",
    phone: "01810000002",
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
    title: "Modern 3-Bed Apartment in Gulshan",
    description:
      "Bright family apartment with lift, generator backup and lake view.",
    address: "Road 45, Gulshan 2",
    city: "Dhaka",
    division: "Dhaka",
    rentAmount: 450,
    bedrooms: 3,
    bathrooms: 3,
    area: 1650,
    propertyType: "APARTMENT",
    amenities: ["wifi", "parking", "lift", "generator"],
    images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688"],
  },
  {
    ownerEmail: "landlord1@rentnest.com",
    category: "Studio",
    title: "Furnished Studio near Dhanmondi Lake",
    description:
      "Compact furnished studio, ideal for students and young professionals.",
    address: "Road 8A, Dhanmondi",
    city: "Dhaka",
    division: "Dhaka",
    rentAmount: 180,
    bedrooms: 1,
    bathrooms: 1,
    area: 450,
    propertyType: "STUDIO",
    amenities: ["wifi", "furnished", "air-conditioning"],
    images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"],
  },
  {
    ownerEmail: "landlord2@rentnest.com",
    category: "House",
    title: "Family House with Garden in Agrabad",
    description:
      "Two-storey house with private garden, rooftop and car parking.",
    address: "Agrabad Commercial Area",
    city: "Chattogram",
    division: "Chattogram",
    rentAmount: 600,
    bedrooms: 4,
    bathrooms: 3,
    area: 2400,
    propertyType: "HOUSE",
    amenities: ["parking", "garden", "rooftop"],
    images: ["https://images.unsplash.com/photo-1568605114967-8130f3a36994"],
  },
  {
    ownerEmail: "landlord2@rentnest.com",
    category: "Villa",
    title: "Hillside Villa in Sylhet",
    description:
      "Spacious villa surrounded by tea gardens with a private pool.",
    address: "Airport Road",
    city: "Sylhet",
    division: "Sylhet",
    rentAmount: 1200,
    bedrooms: 5,
    bathrooms: 4,
    area: 3800,
    propertyType: "VILLA",
    amenities: ["wifi", "parking", "pool", "garden", "generator"],
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
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, password: demoPassword },
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
