export const propertySearchableFields = [
  "title",
  "description",
  "city",
  "address",
];

export const propertyFilterableFields = [
  "city",
  "propertyType",
  "availabilityStatus",
  "minPrice",
  "maxPrice",
];

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