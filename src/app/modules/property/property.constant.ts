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

// The statuses a landlord may set by hand on a rental. Sale homes move
// through UNDER_CONTRACT and SOLD by the offer flow only.
export const RENTAL_AVAILABILITY_STATUSES = ["AVAILABLE", "RENTED"] as const;
