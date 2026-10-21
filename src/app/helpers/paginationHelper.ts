import { z } from "zod";
import {
  TMeta,
  TPaginationOptions,
  TPaginationReturn,
} from "../interfaces/pagination.js";

export const paginationFields = ["page", "limit", "sortBy", "sortOrder"];

const MAX_LIMIT = 100;

// Zod query fields shared by every paginated list; sortBy is limited per resource.
const paginationQueryFields = <T extends readonly [string, ...string[]]>(
  sortableFields: T,
) => ({
  page: z.coerce.number().int().positive("Page must be at least 1").optional(),
  limit: z.coerce
    .number()
    .int()
    .positive("Limit must be at least 1")
    .max(MAX_LIMIT, `Limit cannot exceed ${MAX_LIMIT}`)
    .optional(),
  sortBy: z.enum(sortableFields).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

const calculatePagination = (
  options: TPaginationOptions,
): TPaginationReturn => {
  const page = Number(options.page || 1);
  const limit = Math.min(Number(options.limit || 10), MAX_LIMIT);

  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    sortBy: options.sortBy || "createdAt",
    sortOrder: options.sortOrder || "desc",
  };
};

const buildMeta = (page: number, limit: number, total: number): TMeta => ({
  page,
  limit,
  total,
  totalPage: Math.ceil(total / limit),
});

export const paginationHelper = {
  calculatePagination,
  paginationQueryFields,
  buildMeta,
};
