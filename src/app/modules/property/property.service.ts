import { Prisma, $Enums } from "../../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import httpStatus from "http-status";
import AppError from "../../utils/AppError.js";
import { paginationHelper } from "../../helpers/paginationHelper.js";
import { TPaginationOptions } from "../../interfaces/pagination.js";
import {
  ADMIN_REVIEW_LINK,
  APPROVED_ONLY,
  LANDLORD_PROPERTIES_LINK,
  propertySearchableFields,
  REVIEW_TRANSITIONS,
} from "./property.constant.js";
import { geocoder } from "../../helpers/geocoder.js";
import { NotificationServices } from "../notification/notification.service.js";
import {
  TCreateProperty,
  TListingType,
  TPropertyFilters,
  TPropertyListOptions,
  TPropertyViewer,
  TReviewProperty,
  TUpdateProperty,
} from "./property.interface.js";

// The admin's note and who reviewed a listing are for the landlord and the
// admins, not the public.
const PUBLIC_OMIT = { reviewNote: true, reviewedById: true } as const;

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

/** A listing's price range: rentAmount for RENT, salePrice for SALE. */
const priceCondition = (
  listingType: TListingType,
  minPrice?: number,
  maxPrice?: number,
): Prisma.PropertyWhereInput => {
  const range = {
    ...(minPrice !== undefined ? { gte: minPrice } : {}),
    ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
  };
  return listingType === "SALE"
    ? { listingType, salePrice: range }
    : { listingType, rentAmount: range };
};

/**
 * Sort order. "price" means rentAmount for RENT and salePrice for SALE; when
 * both types are listed, rentals come first (by rent), then homes for sale
 * (by price), since the two prices aren't comparable.
 */
const buildOrderBy = (
  sortBy: string,
  sortOrder: Prisma.SortOrder,
  listingType?: TListingType,
): Prisma.PropertyOrderByWithRelationInput[] => {
  if (sortBy !== "price") return [{ [sortBy]: sortOrder }];
  if (listingType === "SALE") return [{ salePrice: sortOrder }];
  if (listingType === "RENT") return [{ rentAmount: sortOrder }];
  return [
    { rentAmount: { sort: sortOrder, nulls: "last" } },
    { salePrice: { sort: sortOrder, nulls: "last" } },
  ];
};

const createProperty = async (payload: TCreateProperty, ownerId: string) => {
  const category = await prisma.category.findUnique({
    where: {
      id: payload.categoryId,
    },
  });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  // A pin sent by the landlord wins; otherwise look the address up. A failed
  // lookup saves the property without coordinates.
  const coordinates =
    payload.latitude !== undefined && payload.longitude !== undefined
      ? { latitude: payload.latitude, longitude: payload.longitude }
      : await geocoder.geocodeAddress(payload);

  const result = await prisma.property.create({
    data: {
      title: payload.title,
      description: payload.description,
      address: payload.address,
      city: payload.city,
      division: payload.division,

      // Validation keeps only the price that matches the listing type.
      listingType: payload.listingType,
      rentAmount: payload.listingType === "RENT" ? payload.rentAmount : null,
      salePrice: payload.listingType === "SALE" ? payload.salePrice : null,
      bedrooms: payload.bedrooms,
      bathrooms: payload.bathrooms,
      area: payload.area,
      propertyType: payload.propertyType as $Enums.PropertyType,

      categoryId: payload.categoryId,
      amenities: payload.amenities,

      images: payload.images,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      ownerId,

      // Public only once an admin approves it.
      reviewStatus: "PENDING",
    },
  });

  await NotificationServices.notifyAdmins({
    type: "PROPERTY_SUBMITTED",
    title: "New listing to review",
    message: `${result.title} in ${result.city}, ${result.division} is waiting for review.`,
    link: ADMIN_REVIEW_LINK,
  });

  return result;
};
const getAllProperties = async (
  filters: TPropertyFilters,
  options: TPaginationOptions,
  listOptions: TPropertyListOptions = {},
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const {
    ownerId,
    reviewStatus,
    searchTerm,
    listingType,
    city,
    division,
    propertyType,
    availabilityStatus,
    categoryId,
    amenities,
    minPrice,
    maxPrice,
  } = filters;

  const andConditions: Prisma.PropertyWhereInput[] = [];

  if (ownerId) {
    andConditions.push({ ownerId });
  }

  if (listOptions.approvedOnly) {
    andConditions.push(APPROVED_ONLY);
  } else if (reviewStatus) {
    andConditions.push({ reviewStatus });
  }

  if (listingType) {
    andConditions.push({ listingType });
  }

  // Search
  if (searchTerm) {
    andConditions.push({
      OR: propertySearchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  if (city) {
    andConditions.push({
      city: {
        equals: city,
        mode: "insensitive",
      },
    });
  }

  if (division) {
    andConditions.push({
      division: {
        equals: division,
        mode: "insensitive",
      },
    });
  }

  if (propertyType) {
    andConditions.push({
      propertyType: propertyType as $Enums.PropertyType,
    });
  }
  if (categoryId) {
    andConditions.push({
      categoryId,
    });
  }
  if (amenities) {
    const requestedAmenities = amenities
      .split(",")
      .map((amenity) => amenity.trim())
      .filter(Boolean);

    if (requestedAmenities.length > 0) {
      andConditions.push({
        amenities: {
          hasEvery: requestedAmenities,
        },
      });
    }
  }

  if (availabilityStatus) {
    andConditions.push({
      availabilityStatus: availabilityStatus as $Enums.AvailabilityStatus,
    });
  } else if (listOptions.hideSold) {
    // Sold homes stay reachable by link, but public lists skip them.
    andConditions.push({ availabilityStatus: { not: "SOLD" } });
  }

  // The price range applies to rent for RENT and to the price for SALE.
  if (minPrice !== undefined || maxPrice !== undefined) {
    andConditions.push(
      listingType
        ? priceCondition(listingType, minPrice, maxPrice)
        : {
            OR: [
              priceCondition("RENT", minPrice, maxPrice),
              priceCondition("SALE", minPrice, maxPrice),
            ],
          },
    );
  }

  const whereConditions: Prisma.PropertyWhereInput =
    andConditions.length > 0
      ? {
          AND: andConditions,
        }
      : {};

  const [data, total] = await Promise.all([
    prisma.property.findMany({
      where: whereConditions,
      include: propertyInclude,
      omit: listOptions.approvedOnly ? PUBLIC_OMIT : undefined,
      orderBy: buildOrderBy(sortBy, sortOrder as Prisma.SortOrder, listingType),
      skip,
      take: limit,
    }),
    prisma.property.count({ where: whereConditions }),
  ]);

  return {
    meta: paginationHelper.buildMeta(page, limit, total),
    data,
  };
};

/**
 * One property. Listings that aren't approved yet are visible only to their
 * owner and to admins; everyone else gets the same 404 as a missing one.
 */
const getPropertyById = async (id: string, viewer?: TPropertyViewer) => {
  const result = await prisma.property.findUnique({
    where: {
      id,
    },
    include: propertyInclude,
  });

  const canSeeUnreviewed =
    viewer !== undefined &&
    (viewer.role === "ADMIN" || viewer.userId === result?.ownerId);

  if (!result || (result.reviewStatus !== "APPROVED" && !canSeeUnreviewed)) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  if (canSeeUnreviewed) return result;

  const {
    reviewNote: _note,
    reviewedById: _reviewer,
    ...publicProperty
  } = result;
  return publicProperty;
};

const updateProperty = async (
  id: string,
  ownerId: string,
  payload: TUpdateProperty,
) => {
  const property = await prisma.property.findUnique({
    where: {
      id,
    },
  });

  if (!property) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  if (property.ownerId !== ownerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not allowed to update this property",
    );
  }

  if (payload.categoryId) {
    const category = await prisma.category.findUnique({
      where: {
        id: payload.categoryId,
      },
    });

    if (!category) {
      throw new AppError(httpStatus.NOT_FOUND, "Category not found");
    }
  }

  // A type change would strand rental requests or offers made under the old type.
  const listingType = payload.listingType ?? property.listingType;
  if (listingType !== property.listingType) {
    const [bookings, offers] = await Promise.all([
      prisma.booking.count({ where: { propertyId: id } }),
      prisma.purchaseOffer.count({ where: { propertyId: id } }),
    ]);
    if (bookings + offers > 0) {
      throw new AppError(
        httpStatus.CONFLICT,
        "The listing type can't be changed once a home has rental requests or offers",
      );
    }
  }

  const {
    latitude,
    longitude,
    rentAmount,
    salePrice,
    availabilityStatus,
    ...changes
  } = payload;

  // Only the price that matches the listing type is stored; the other is null.
  let prices: { rentAmount?: number | null; salePrice?: number | null };
  if (listingType === "RENT") {
    if (rentAmount === undefined && property.rentAmount === null) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Rent amount is required for a rental listing",
      );
    }
    prices = { rentAmount, salePrice: null };
  } else {
    if (salePrice === undefined && property.salePrice === null) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Sale price is required for a listing for sale",
      );
    }
    prices = { salePrice, rentAmount: null };
  }

  // Homes for sale go under contract and sold through the offer flow only.
  if (availabilityStatus !== undefined && listingType === "SALE") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "A home for sale changes status through its offers, not by hand",
    );
  }

  // Coordinates: a pin sent by the landlord wins; otherwise re-geocode only
  // when the address, city or state actually changed (null if that fails,
  // since the old pin would point to the old address).
  const locationChanged =
    (changes.address !== undefined && changes.address !== property.address) ||
    (changes.city !== undefined && changes.city !== property.city) ||
    (changes.division !== undefined && changes.division !== property.division);

  let coordinates:
    { latitude: number | null; longitude: number | null } | undefined;
  if (latitude !== undefined && longitude !== undefined) {
    coordinates = { latitude, longitude };
  } else if (locationChanged) {
    const found = await geocoder.geocodeAddress({
      address: changes.address ?? property.address,
      city: changes.city ?? property.city,
      division: changes.division ?? property.division,
    });
    coordinates = found ?? { latitude: null, longitude: null };
  }

  // Fixing a rejected listing sends it back to the admins; edits to a
  // pending or approved one leave its review status as it is.
  const resubmitted = property.reviewStatus === "REJECTED";

  const result = await prisma.property.update({
    where: {
      id,
    },
    data: {
      ...changes,
      ...prices,
      ...coordinates,
      ...(resubmitted
        ? { reviewStatus: "PENDING" as const, reviewNote: null }
        : {}),

      propertyType: payload.propertyType
        ? (payload.propertyType as $Enums.PropertyType)
        : undefined,

      // A new listing type starts out AVAILABLE (a hand-set RENTED means
      // nothing for a home for sale).
      availabilityStatus: (availabilityStatus ??
        (listingType !== property.listingType ? "AVAILABLE" : undefined)) as
        $Enums.AvailabilityStatus | undefined,
    },
  });

  if (resubmitted) {
    await NotificationServices.notifyAdmins({
      type: "PROPERTY_SUBMITTED",
      title: "Listing resubmitted for review",
      message: `${result.title} in ${result.city}, ${result.division} was updated after a rejection and is waiting for review.`,
      link: ADMIN_REVIEW_LINK,
    });
  }

  return result;
};

/**
 * An admin approves or rejects a listing. The update is conditional on the
 * status it may come from (see REVIEW_TRANSITIONS), so two admins deciding
 * at once can't both apply; the owner is notified only after it succeeds.
 */
const reviewProperty = async (
  id: string,
  adminId: string,
  payload: TReviewProperty,
) => {
  const property = await prisma.property.findUnique({
    where: { id },
    select: { reviewStatus: true },
  });

  if (!property) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  const from: readonly $Enums.PropertyReviewStatus[] =
    REVIEW_TRANSITIONS[payload.status];
  if (!from.includes(property.reviewStatus)) {
    throw new AppError(
      httpStatus.CONFLICT,
      `This listing is already ${property.reviewStatus.toLowerCase()}`,
    );
  }

  const { count } = await prisma.property.updateMany({
    where: { id, reviewStatus: { in: [...from] } },
    data: {
      reviewStatus: payload.status,
      reviewNote: payload.note ?? null,
      reviewedAt: new Date(),
      reviewedById: adminId,
    },
  });

  if (count === 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This listing was just reviewed. Refresh and try again.",
    );
  }

  const result = await prisma.property.findUniqueOrThrow({
    where: { id },
    include: propertyInclude,
  });

  await NotificationServices.notify(
    result.ownerId,
    payload.status === "APPROVED"
      ? {
          type: "PROPERTY_APPROVED",
          title: "Listing approved",
          message: `${result.title} is approved and now visible to everyone.`,
          link: LANDLORD_PROPERTIES_LINK,
        }
      : {
          type: "PROPERTY_REJECTED",
          title: "Listing not approved",
          message: `${result.title} wasn't approved: ${payload.note}. Edit the listing to send it for review again.`,
          link: LANDLORD_PROPERTIES_LINK,
        },
  );

  return result;
};

/**
 * Every state that has approved properties, busiest first (for the admin state picker
 * and state landing pages); only one listing type's homes when it's given.
 */
const getPropertyStates = async (listingType?: TListingType) => {
  const where = { ...APPROVED_ONLY, ...(listingType ? { listingType } : {}) };
  const [all, available] = await Promise.all([
    prisma.property.groupBy({
      by: ["division"],
      where,
      _count: { _all: true },
    }),
    prisma.property.groupBy({
      by: ["division"],
      where: { ...where, availabilityStatus: "AVAILABLE" },
      _count: { _all: true },
    }),
  ]);

  const availableByState = new Map(
    available.map((group) => [group.division, group._count._all]),
  );

  return all
    .map((group) => ({
      state: group.division,
      propertyCount: group._count._all,
      availableCount: availableByState.get(group.division) ?? 0,
    }))
    .toSorted(
      (a, b) =>
        b.propertyCount - a.propertyCount || a.state.localeCompare(b.state),
    );
};

const MAP_LIMIT = 1000;

/**
 * Every approved property with coordinates (sold homes left out), trimmed to
 * what a map pin and popup need. `price` is whichever price applies.
 */
const getMapProperties = async (listingType?: TListingType) => {
  const properties = await prisma.property.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
      availabilityStatus: { not: "SOLD" },
      ...APPROVED_ONLY,
      ...(listingType ? { listingType } : {}),
    },
    select: {
      id: true,
      title: true,
      latitude: true,
      longitude: true,
      listingType: true,
      rentAmount: true,
      salePrice: true,
      city: true,
      division: true,
      availabilityStatus: true,
      images: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: MAP_LIMIT,
  });

  return properties.map(({ images, ...property }) => ({
    ...property,
    price:
      property.listingType === "SALE"
        ? property.salePrice
        : property.rentAmount,
    image:
      Array.isArray(images) && typeof images[0] === "string" ? images[0] : null,
  }));
};

const deleteProperty = async (id: string, ownerId: string) => {
  const property = await prisma.property.findUnique({
    where: {
      id,
    },
  });

  if (!property) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  if (property.ownerId !== ownerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not allowed to delete this property",
    );
  }

  const result = await prisma.property.delete({
    where: {
      id,
    },
  });

  return result;
};

export const PropertyServices = {
  createProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  getMapProperties,
  getPropertyStates,
  reviewProperty,
};
