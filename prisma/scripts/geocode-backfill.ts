import prisma from "../../src/lib/prisma.js";
import { geocoder } from "../../src/app/helpers/geocoder.js";

// One-off: fills latitude/longitude for properties that don't have them yet.
// Nominatim allows 1 request per second, so it waits 1.1 s between lookups.
// Safe to run more than once (only touches rows without coordinates).

const DELAY_MS = 1100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const properties = await prisma.property.findMany({
    where: {
      OR: [{ latitude: null }, { longitude: null }],
    },
    select: {
      id: true,
      title: true,
      address: true,
      city: true,
      division: true,
    },
  });

  console.log(`📍 ${properties.length} properties without coordinates\n`);

  let found = 0;
  for (const [index, property] of properties.entries()) {
    if (index > 0) await sleep(DELAY_MS);

    const coordinates = await geocoder.geocodeAddress(property);

    if (coordinates) {
      await prisma.property.update({
        where: { id: property.id },
        data: coordinates,
      });
      found++;
      console.log(
        `   ✓ ${property.title}  (${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)})`,
      );
    } else {
      console.log(
        `   ✗ ${property.title}  (no match for "${property.address}, ${property.city}, ${property.division}")`,
      );
    }
  }

  console.log(`\n✅ Geocoded ${found} of ${properties.length}`);
}

main()
  .catch((error) => {
    console.error("Geocode backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
