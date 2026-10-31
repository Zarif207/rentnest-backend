import prisma from "../../../lib/prisma.js";
import { Prisma } from "../../../../generated/prisma/client.js";
import { normalizeUsState } from "../../constants/usStates.js";
import { PROPERTY_TYPES } from "../property/property.constant.js";
import {
  DEFAULT_SECTION_ORDER,
  HOMEPAGE_KEY,
  HOMEPAGE_LIMITS,
} from "./siteSetting.constant.js";
import { SiteSettingValidation } from "./siteSetting.validation.js";
import { THomepageConfig } from "./siteSetting.interface.js";

// Same shape as the property list endpoints, so the frontend reuses its types.
const propertyInclude = {
  category: {
    select: {
      id: true,
      name: true,
    },
  },
  owner: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  },
} as const;

const firstImage = (images: unknown) =>
  Array.isArray(images) && typeof images[0] === "string" ? images[0] : null;

/** Full properties in the given order; ids that no longer exist are dropped. */
const findPropertiesInOrder = async (ids: string[]) => {
  if (ids.length === 0) return [];

  const properties = await prisma.property.findMany({
    where: { id: { in: ids } },
    include: propertyInclude,
  });
  const byId = new Map(properties.map((property) => [property.id, property]));

  return ids.flatMap((id) => {
    const property = byId.get(id);
    return property ? [property] : [];
  });
};

/** Config used until an admin saves one: newest listings and the busiest states. */
const buildDefaultConfig = async (): Promise<THomepageConfig> => {
  const [newest, stateGroups] = await Promise.all([
    prisma.property.findMany({
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: Math.max(HOMEPAGE_LIMITS.defaultFeatured, HOMEPAGE_LIMITS.hero),
    }),
    prisma.property.groupBy({
      by: ["division"],
      _count: { _all: true },
      orderBy: { _count: { division: "desc" } },
      take: HOMEPAGE_LIMITS.states,
    }),
  ]);

  // Each default state uses a photo from one of its listings.
  const states: THomepageConfig["states"]["items"] = [];
  for (const group of stateGroups) {
    const state = normalizeUsState(group.division);
    if (!state || states.some((item) => item.state === state)) continue;

    const withImage = await prisma.property.findFirst({
      where: { division: group.division },
      select: { images: true },
      orderBy: { createdAt: "desc" },
    });
    const imageUrl = firstImage(withImage?.images);
    if (imageUrl) states.push({ state, imageUrl });
  }

  const newestIds = newest.map((property) => property.id);

  return {
    hero: { propertyIds: newestIds.slice(0, HOMEPAGE_LIMITS.hero) },
    featured: {
      enabled: true,
      propertyIds: newestIds.slice(0, HOMEPAGE_LIMITS.defaultFeatured),
    },
    states: { enabled: states.length > 0, items: states },
    propertyTypes: {
      enabled: true,
      items: PROPERTY_TYPES.map((type) => ({ type })),
    },
    latest: { enabled: true, count: HOMEPAGE_LIMITS.defaultLatest },
    sectionOrder: DEFAULT_SECTION_ORDER,
  };
};

/** The saved config (or defaults if none, or if a saved one is no longer valid). */
const loadConfig = async () => {
  const saved = await prisma.siteSetting.findUnique({
    where: { key: HOMEPAGE_KEY },
  });

  const parsed = saved
    ? SiteSettingValidation.homepageConfigSchema.safeParse(saved.value)
    : null;

  if (saved && parsed?.success) {
    return {
      config: parsed.data,
      isDefault: false,
      updatedAt: saved.updatedAt,
    };
  }

  return {
    config: await buildDefaultConfig(),
    isDefault: true,
    updatedAt: null,
  };
};

/** Turns ids into properties and adds live counts and prices. */
const resolveConfig = async (config: THomepageConfig) => {
  const [hero, featured, latest, availableByState, countsByType] =
    await Promise.all([
      findPropertiesInOrder(config.hero.propertyIds),
      findPropertiesInOrder(config.featured.propertyIds),
      prisma.property.findMany({
        include: propertyInclude,
        orderBy: { createdAt: "desc" },
        take: config.latest.count,
      }),
      prisma.property.groupBy({
        by: ["division", "listingType"],
        where: { availabilityStatus: "AVAILABLE" },
        _count: { _all: true },
        _min: { rentAmount: true, salePrice: true },
      }),
      prisma.property.groupBy({
        by: ["propertyType", "listingType"],
        _count: { _all: true },
      }),
    ]);

  // Available listings per state (case-insensitive on the stored name), with
  // rent and sale kept apart: their counts and starting prices differ.
  type TListingStats = {
    count: number;
    startingPrice: Prisma.Decimal | null;
  };
  const stateStats = new Map<
    string,
    { rent: TListingStats; sale: TListingStats }
  >();
  for (const group of availableByState) {
    const key = group.division.toLowerCase();
    const stats = stateStats.get(key) ?? {
      rent: { count: 0, startingPrice: null },
      sale: { count: 0, startingPrice: null },
    };
    if (group.listingType === "SALE") {
      stats.sale = {
        count: group._count._all,
        startingPrice: group._min.salePrice,
      };
    } else {
      stats.rent = {
        count: group._count._all,
        startingPrice: group._min.rentAmount,
      };
    }
    stateStats.set(key, stats);
  }

  const typeCount = (type: string, listingType?: "RENT" | "SALE") =>
    countsByType
      .filter(
        (group) =>
          group.propertyType === type &&
          (!listingType || group.listingType === listingType),
      )
      .reduce((sum, group) => sum + group._count._all, 0);

  // A type without an admin image falls back to a photo of one of its listings.
  const typeItems = await Promise.all(
    config.propertyTypes.items.map(async (item) => {
      let imageUrl = item.imageUrl ?? null;
      if (!imageUrl) {
        const listing = await prisma.property.findFirst({
          where: { propertyType: item.type },
          select: { images: true },
          orderBy: { createdAt: "desc" },
        });
        imageUrl = firstImage(listing?.images);
      }
      return {
        type: item.type,
        imageUrl,
        propertyCount: typeCount(item.type),
        rentCount: typeCount(item.type, "RENT"),
        saleCount: typeCount(item.type, "SALE"),
      };
    }),
  );

  return {
    hero: { properties: hero },
    featured: {
      enabled: config.featured.enabled,
      title: config.featured.title ?? null,
      properties: featured,
    },
    states: {
      enabled: config.states.enabled,
      items: config.states.items.map((item) => {
        const stats = stateStats.get(item.state.toLowerCase());
        const rent = stats?.rent ?? { count: 0, startingPrice: null };
        const sale = stats?.sale ?? { count: 0, startingPrice: null };
        return {
          state: item.state,
          imageUrl: item.imageUrl,
          // Kept as before (rentals) for clients that predate sale listings.
          propertyCount: rent.count,
          startingPrice: rent.startingPrice,
          rent,
          sale,
        };
      }),
    },
    propertyTypes: {
      enabled: config.propertyTypes.enabled,
      items: typeItems,
    },
    latest: {
      enabled: config.latest.enabled,
      count: config.latest.count,
      properties: latest,
    },
    sectionOrder: config.sectionOrder,
  };
};

const getHomepage = async () => {
  const { config, isDefault, updatedAt } = await loadConfig();
  return { ...(await resolveConfig(config)), isDefault, updatedAt };
};

const getHomepageConfig = async () => loadConfig();

const updateHomepageConfig = async (config: THomepageConfig) => {
  const saved = await prisma.siteSetting.upsert({
    where: { key: HOMEPAGE_KEY },
    update: { value: config as Prisma.InputJsonValue },
    create: { key: HOMEPAGE_KEY, value: config as Prisma.InputJsonValue },
  });

  return { config, isDefault: false, updatedAt: saved.updatedAt };
};

export const SiteSettingServices = {
  getHomepage,
  getHomepageConfig,
  updateHomepageConfig,
};
