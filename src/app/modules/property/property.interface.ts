export type TPropertyFilters = {
  searchTerm?: string;
  city?: string;
  division?: string;
  propertyType?: string;
  availabilityStatus?: string;
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

  images: string[];
};
