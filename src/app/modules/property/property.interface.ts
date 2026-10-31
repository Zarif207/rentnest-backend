export type TListingType = "RENT" | "SALE";

export type TPropertyFilters = {
  searchTerm?: string;
  listingType?: TListingType;
  city?: string;
  division?: string;
  propertyType?: string;
  availabilityStatus?: string;
  categoryId?: string;
  amenities?: string;
  minPrice?: number;
  maxPrice?: number;
  ownerId?: string;
};

export type TPropertyListOptions = {
  // Public lists leave SOLD homes out unless they're asked for by status.
  hideSold?: boolean;
};

export type TCreateProperty = {
  title: string;
  description: string;
  address: string;
  city: string;
  division: string;

  listingType: TListingType;
  rentAmount?: number;
  salePrice?: number;
  bedrooms: number;
  bathrooms: number;
  area: number;

  propertyType: string;

  categoryId: string;
  amenities: string[];

  images: string[];

  latitude?: number;
  longitude?: number;
};

export type TUpdateProperty = {
  title?: string;
  description?: string;
  address?: string;
  city?: string;
  division?: string;
  listingType?: TListingType;
  rentAmount?: number;
  salePrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  propertyType?: string;
  availabilityStatus?: string;
  categoryId?: string;
  amenities?: string[];
  images?: string[];
  latitude?: number;
  longitude?: number;
};
