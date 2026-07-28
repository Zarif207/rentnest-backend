export type TPaginationOptions = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type TPaginationReturn = {
  page: number;
  limit: number;
  skip: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};