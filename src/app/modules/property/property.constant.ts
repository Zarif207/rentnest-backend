import { Prisma } from "../../../../generated/prisma/client.js";

export const propertySearchableFields = [
  "title",
  "description",
  "city",
  "address",
];

export const propertyFilterableFields = [
  "searchTerm",
  "listingType",
  "city",
  "division",
  "propertyType",
  "availabilityStatus",
  "categoryId",
  "amenities",
  "minPrice",
  "maxPrice",
];

// Admin and landlord lists can also filter by review status.
export const reviewablePropertyFilterableFields = [
  ...propertyFilterableFields,
  "reviewStatus",
];

// "price" sorts by rentAmount for RENT and salePrice for SALE.
export const propertySortableFields = [
  "createdAt",
  "price",
  "rentAmount",
  "area",
  "bedrooms",
  "title",
] as const;

export const PROPERTY_TYPES = [
  "APARTMENT",
  "HOUSE",
  "STUDIO",
  "VILLA",
] as const;

export const LISTING_TYPES = ["RENT", "SALE"] as const;

export const AVAILABILITY_STATUSES = [
  "AVAILABLE",
  "RENTED",
  "UNDER_CONTRACT",
  "SOLD",
] as const;

export const REVIEW_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

// Only listings an admin approved are public: add this to public queries.
export const APPROVED_ONLY = { reviewStatus: "APPROVED" } as const;

// Rented and sold homes keep their own page but drop out of public lists.
export const OPEN_AVAILABILITY = {
  availabilityStatus: { notIn: ["RENTED", "SOLD"] },
} satisfies Prisma.PropertyWhereInput;

// What public lists, the map, states and the homepage show by default.
export const PUBLIC_LISTING = {
  ...APPROVED_ONLY,
  ...OPEN_AVAILABILITY,
} satisfies Prisma.PropertyWhereInput;

// Where an admin's decision may come from: approving works on a pending or a
// rejected listing, rejecting only on a pending one.
export const REVIEW_TRANSITIONS = {
  APPROVED: ["PENDING", "REJECTED"],
  REJECTED: ["PENDING"],
} as const;

// Where admins and landlords open a listing under review.
export const ADMIN_REVIEW_LINK = "/dashboard/admin/properties?review=PENDING";
export const LANDLORD_PROPERTIES_LINK = "/dashboard/landlord/properties";

// The statuses a landlord may set by hand on a rental. Sale homes move
// through UNDER_CONTRACT and SOLD by the offer flow only.
export const RENTAL_AVAILABILITY_STATUSES = ["AVAILABLE", "RENTED"] as const;
