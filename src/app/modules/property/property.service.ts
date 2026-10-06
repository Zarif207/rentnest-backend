import { Prisma, $Enums } from "../../../../generated/prisma/client";
import prisma from "../../../lib/prisma";
import httpStatus from "http-status";
import AppError from "../../utils/AppError";
import {
  TCreateProperty,
  TPropertyFilters,
  TUpdateProperty,
} from "./property.interface";

const createProperty = async (payload: TCreateProperty, ownerId: string) => {
  const category = await prisma.category.findUnique({
    where: {
      id: payload.categoryId,
    },
  });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }
  const result = await prisma.property.create({
    data: {
      title: payload.title,
      description: payload.description,
      address: payload.address,
      city: payload.city,
      division: payload.division,

      rentAmount: payload.rentAmount,
      bedrooms: payload.bedrooms,
      bathrooms: payload.bathrooms,
      area: payload.area,
      propertyType: payload.propertyType as $Enums.PropertyType,

      categoryId: payload.categoryId,
      amenities: payload.amenities,

      images: payload.images,
      ownerId,
    },
  });

  return result;
};
const getAllProperties = async (filters: TPropertyFilters) => {
  const {
    searchTerm,
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

  // Search
  if (searchTerm) {
    andConditions.push({
      OR: [
        {
          title: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          city: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          address: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      ],
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
  }

  if (minPrice || maxPrice) {
    andConditions.push({
      rentAmount: {
        ...(minPrice ? { gte: Number(minPrice) } : {}),
        ...(maxPrice ? { lte: Number(maxPrice) } : {}),
      },
    });
  }

  const whereConditions: Prisma.PropertyWhereInput =
    andConditions.length > 0
      ? {
          AND: andConditions,
        }
      : {};

  const result = await prisma.property.findMany({
    where: whereConditions,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return result;
};

const getPropertyById = async (id: string) => {
  const result = await prisma.property.findUnique({
    where: {
      id,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  return result;
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

  const result = await prisma.property.update({
    where: {
      id,
    },
    data: {
      ...payload,

      propertyType: payload.propertyType
        ? (payload.propertyType as $Enums.PropertyType)
        : undefined,

      availabilityStatus: payload.availabilityStatus
        ? (payload.availabilityStatus as $Enums.AvailabilityStatus)
        : undefined,
    },
  });

  return result;
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
};
