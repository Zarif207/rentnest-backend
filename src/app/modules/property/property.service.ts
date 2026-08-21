import { Prisma, $Enums } from "../../../../generated/prisma/client";
import prisma from "../../../lib/prisma";
import { TCreateProperty, TPropertyFilters } from "./property.interface";
import httpStatus from "http-status";
import AppError from "../../utils/AppError";

const createProperty = async (payload: TCreateProperty, ownerId: string) => {
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

  // City
  if (city) {
    andConditions.push({
      city: {
        equals: city,
        mode: "insensitive",
      },
    });
  }

  // Division
  if (division) {
    andConditions.push({
      division: {
        equals: division,
        mode: "insensitive",
      },
    });
  }

  // Property type
  if (propertyType) {
    andConditions.push({
      propertyType: propertyType as $Enums.PropertyType,
    });
  }

  // Availability
  if (availabilityStatus) {
    andConditions.push({
      availabilityStatus: availabilityStatus as $Enums.AvailabilityStatus,
    });
  }

  // Price range
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
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Property not found"
    );
  }

  return result;
};

export const PropertyServices = {
  getAllProperties,
  createProperty,
  getPropertyById,
};
