export const propertySearchableFields = [
  "title",
  "description",
  "city",
  "address",
];

export const propertyFilterableFields = [
  "searchTerm",
  "city",
  "division",
  "propertyType",
  "availabilityStatus",
  "categoryId",
  "amenities",
  "minPrice",
  "maxPrice",
];

export const propertySortableFields = [
  "createdAt",
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

export const AVAILABILITY_STATUSES = [
  "AVAILABLE",
  "RENTED",
] as const;