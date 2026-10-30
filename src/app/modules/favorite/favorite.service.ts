import httpStatus from "http-status";
import prisma from "../../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import { paginationHelper } from "../../helpers/paginationHelper.js";
import { TPaginationOptions } from "../../interfaces/pagination.js";
import { favoritePropertySelect } from "./favorite.constant.js";

const firstImage = (images: unknown) =>
  Array.isArray(images) && typeof images[0] === "string" ? images[0] : null;

const getMyFavorites = async (userId: string, options: TPaginationOptions) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const where = { userId };

  const [favorites, total] = await Promise.all([
    prisma.favorite.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        property: {
          select: favoritePropertySelect,
        },
      },
    }),
    prisma.favorite.count({ where }),
  ]);

  const data = favorites.map(
    ({ property: { images, ...property }, ...favorite }) => ({
      ...favorite,
      property: {
        ...property,
        image: firstImage(images),
      },
    }),
  );

  return {
    meta: paginationHelper.buildMeta(page, limit, total),
    data,
  };
};

const getMyFavoriteIds = async (userId: string) => {
  const favorites = await prisma.favorite.findMany({
    where: {
      userId,
    },
    select: {
      propertyId: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return favorites.map((favorite) => favorite.propertyId);
};

/** Saves a property. Idempotent: an already-saved property is returned as is. */
const addFavorite = async (userId: string, propertyId: string) => {
  const property = await prisma.property.findUnique({
    where: {
      id: propertyId,
    },
    select: {
      id: true,
    },
  });

  if (!property) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  const existing = await prisma.favorite.findUnique({
    where: {
      userId_propertyId: {
        userId,
        propertyId,
      },
    },
  });

  if (existing) {
    return { favorite: existing, created: false };
  }

  // upsert also covers two saves racing each other.
  const favorite = await prisma.favorite.upsert({
    where: {
      userId_propertyId: {
        userId,
        propertyId,
      },
    },
    update: {},
    create: {
      userId,
      propertyId,
    },
  });

  return { favorite, created: true };
};

/** Removes a saved property. Idempotent: removing one that isn't saved is fine. */
const removeFavorite = async (userId: string, propertyId: string) => {
  const { count } = await prisma.favorite.deleteMany({
    where: {
      userId,
      propertyId,
    },
  });

  return { removed: count > 0 };
};

export const FavoriteServices = {
  getMyFavorites,
  getMyFavoriteIds,
  addFavorite,
  removeFavorite,
};
