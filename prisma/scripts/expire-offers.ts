import prisma from "../../src/lib/prisma.js";
import { OfferServices } from "../../src/app/modules/offer/offer.service.js";

// Expires open offers (pending, countered, or accepted without a paid
// deposit) after 7 days with no action. The API also does this lazily
// whenever offers are read, so running this is optional; it just keeps the
// table tidy. Safe to run any time.

async function main() {
  const expired = await OfferServices.expireStaleOffers();
  console.log(
    `⏳ ${expired} stale ${expired === 1 ? "offer" : "offers"} expired`,
  );
}

main()
  .catch((error) => {
    console.error("Offer expiry failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
