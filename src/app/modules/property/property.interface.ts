export type TPropertyFilters = {
  searchTerm?: string;
  city?: string;
  division?: string;
  propertyType?: string;
  availabilityStatus?: string;
  categoryId?: string;
  amenities?: string;
  minPrice?: string;
  maxPrice?: string;
};

export type TCreateProperty = {
  title: string;
  description: string;
  address: string;
  city: string;
  division: string;

  rentAmount: number;
  bedrooms: number;
  bathrooms: number;
  area: number;

  propertyType: string;

  categoryId: string;
  amenities: string[];

  images: string[];
};

export type TUpdateProperty = {
  title?: string;
  description?: string;
  address?: string;
  city?: string;
  division?: string;
  rentAmount?: number;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  propertyType?: string;
  availabilityStatus?: string;
  categoryId?: string;
  amenities?: string[];
  images?: string[];
};