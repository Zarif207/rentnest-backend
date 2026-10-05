import httpStatus from "http-status";
import prisma from "../../../lib/prisma";
import AppError from "../../utils/AppError";
import { TCreateCategory, TUpdateCategory } from "./category.interface";

const createCategory = async (payload: TCreateCategory) => {
  const existingCategory = await prisma.category.findUnique({
    where: {
      name: payload.name,
    },
  });

  if (existingCategory) {
    throw new AppError(httpStatus.CONFLICT, "Category already exists");
  }

  return prisma.category.create({
    data: {
      name: payload.name,
    },
  });
};

const getAllCategories = async () => {
  return prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
  });
};

const getCategoryById = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: {
      id,
    },
  });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  return category;
};

const updateCategory = async (id: string, payload: TUpdateCategory) => {
  const category = await prisma.category.findUnique({
    where: {
      id,
    },
  });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  const existingCategory = await prisma.category.findFirst({
    where: {
      name: payload.name,
      NOT: {
        id,
      },
    },
  });

  if (existingCategory) {
    throw new AppError(httpStatus.CONFLICT, "Category already exists");
  }

  return prisma.category.update({
    where: {
      id,
    },
    data: payload,
  });
};

const deleteCategory = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: {
      id,
    },
    include: {
      properties: true,
    },
  });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  if (category.properties.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Cannot delete a category that is assigned to properties",
    );
  }

  await prisma.category.delete({
    where: {
      id,
    },
  });
};

export const CategoryServices = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
