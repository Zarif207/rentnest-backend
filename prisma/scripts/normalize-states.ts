import prisma from "../../src/lib/prisma.js";
import { normalizeUsState } from "../../src/app/constants/usStates.js";

// One-off fix: rewrites every property's `division` to the full US state name
// ("MI" → "Michigan"). Safe to run more than once. Unknown values are listed
// and left untouched so you can fix them by hand.

async function main() {
  const properties = await prisma.property.findMany({
    select: { id: true, title: true, division: true },
  });

  let updated = 0;
  const unknown: { id: string; title: string; division: string }[] = [];

  for (const property of properties) {
    const state = normalizeUsState(property.division);

    if (!state) {
      unknown.push(property);
      continue;
    }

    if (state !== property.division) {
      await prisma.property.update({
        where: { id: property.id },
        data: { division: state },
      });
      console.log(`   ${property.division} → ${state}  (${property.title})`);
      updated++;
    }
  }

  console.log(
    `\n✅ States normalized: ${updated} updated, ${properties.length - updated - unknown.length} already correct`,
  );

  if (unknown.length > 0) {
    console.log(`\n⚠️  ${unknown.length} with an unknown state (left as is):`);
    for (const property of unknown)
      console.log(
        `   - "${property.division}"  ${property.title} (${property.id})`,
      );
  }
}

main()
  .catch((error) => {
    console.error("State normalization failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
