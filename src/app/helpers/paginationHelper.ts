type TPaginationOptions = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

const calculatePagination = (
  options: TPaginationOptions
) => {
  const page = Number(options.page || 1);
  const limit = Number(options.limit || 10);

  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    sortBy: options.sortBy,
    sortOrder: options.sortOrder,
  };
};

export const paginationHelper = {
  calculatePagination,
};