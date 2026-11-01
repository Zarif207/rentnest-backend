export type TListingType = "RENT" | "SALE";

export type TReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

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
  // Admin and landlord lists only; public lists are always APPROVED.
  reviewStatus?: TReviewStatus;
};

export type TPropertyListOptions = {
  // Public lists leave RENTED and SOLD homes out unless asked for by status.
  hideClosed?: boolean;
  // Public lists show only listings an admin approved.
  approvedOnly?: boolean;
};

/** Who is asking for a property, when a token was sent (see optionalAuth). */
export type TPropertyViewer = {
  userId: string;
  role: string;
};

export type TReviewProperty = {
  status: Exclude<TReviewStatus, "PENDING">;
  note?: string;
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
