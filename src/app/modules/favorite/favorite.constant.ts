export const favoriteSortableFields = ["createdAt"] as const;

// The property fields a saved-homes card needs (images are trimmed to the first).
export const favoritePropertySelect = {
  id: true,
  title: true,
  city: true,
  division: true,
  rentAmount: true,
  availabilityStatus: true,
  propertyType: true,
  bedrooms: true,
  bathrooms: true,
  area: true,
  images: true,
} as const;
