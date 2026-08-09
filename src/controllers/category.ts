import { FastifyReply, FastifyRequest } from "fastify";
import { Category, CategoryType } from "../entities/category.entity";
import {
  categoryIdParamSchema,
  createCategorySchema,
  getCategoriesSchema,
  updateCategorySchema,
} from "../schemas/category.schema";
import { validateAndThrowError } from "../utils/validation";
import { getAppDataSource } from "../data-source";
import { AppError } from "../utils/app-error";
import { success } from "../utils/response";
import { checkNotNullUserId } from "../utils/common";

interface CategoryParams {
  id: string;
}

interface CreateCategoryBody {
  name: string;
  type: CategoryType;
}

interface GetCategoriesQuery {
  page?: number;
  limit?: number;
  type?: CategoryType;
  includeInactive?: boolean;
}

interface UpdateCategoryBody {
  name?: string;
  categoryStatus?: boolean;
}

export const createCategory = async (
  request: FastifyRequest<{ Body: CreateCategoryBody }>,
  reply: FastifyReply,
) => {
  // Validate body
  const body = validateAndThrowError<CreateCategoryBody>(
    createCategorySchema,
    request.body,
    request.t,
  );
  // Checking user
  const userId = checkNotNullUserId(request);
  const datasource = getAppDataSource();

  // Checking duplicate category
  const existingCategory = await datasource
    .getRepository(Category)
    .createQueryBuilder("category")
    .where("category.user_id = :userId", { userId })
    .andWhere("LOWER(category.name) = LOWER(:name)", { name: body.name })
    .getOne();

  if (existingCategory) {
    throw new AppError(409, request.t("category.alreadyExists"));
  }

  // Create Category
  const category = await datasource.manager.save(
    datasource.manager.create(Category, {
      userId,
      name: body.name,
      type: body.type,
    }),
  );

  // Response
  return reply.code(201).send(
    success(request.t("category.create.success"), {
      id: category.id,
      name: category.name,
      type: category.type,
      categoryStatus: category.categoryStatus,
    }),
  );
};

export const getCategories = async (
  request: FastifyRequest<{ Querystring: GetCategoriesQuery }>,
  reply: FastifyReply,
) => {
  const query = validateAndThrowError<GetCategoriesQuery>(
    getCategoriesSchema,
    request.query,
    request.t,
  );
  const userId = checkNotNullUserId(request);
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const datasource = getAppDataSource();

  const categoryQuery = datasource
    .getRepository(Category)
    .createQueryBuilder("category")
    .where("category.user_id = :userId", { userId });

  if (!query.includeInactive) {
    categoryQuery.andWhere("category.category_status = true");
  }

  if (query.type) {
    categoryQuery.andWhere("category.type = :type", { type: query.type });
  }
  const offset = (page! - 1) * limit!;

  const [categories, total] = await categoryQuery
    .orderBy("category.type", "ASC")
    .addOrderBy("category.name", "ASC")
    .skip(offset)
    .take(limit)
    .getManyAndCount();

  return reply.code(200).send(
    success(request.t("category.get.success"), {
      items: categories.map((category) => ({
        id: category.id,
        name: category.name,
        type: category.type,
        categoryStatus: category.categoryStatus,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }),
  );
};

export const updateCategory = async (
  request: FastifyRequest<{
    Params: CategoryParams;
    Body: UpdateCategoryBody;
  }>,
  reply: FastifyReply,
) => {
  const params = validateAndThrowError<CategoryParams>(
    categoryIdParamSchema,
    request.params,
    request.t,
  );
  const body = validateAndThrowError<UpdateCategoryBody>(
    updateCategorySchema,
    request.body,
    request.t,
  );
  const userId = checkNotNullUserId(request);
  const datasource = getAppDataSource();

  // Check for an category
  const category = await datasource.manager.findOneBy(Category, {
    id: params.id,
    userId,
  });

  if (!category) {
    throw new AppError(404, request.t("category.notFound"));
  }

  // Check for duplicate category exists
  const name = body.name ?? category.name;
  const duplicateCategory = await datasource
    .getRepository(Category)
    .createQueryBuilder("category")
    .where("category.user_id = :userId", { userId })
    .andWhere("category.id != :id", { id: category.id })
    .andWhere("LOWER(category.name) = LOWER(:name)", { name })
    .getOne();

  if (duplicateCategory) {
    throw new AppError(409, request.t("category.alreadyExists"));
  }

  Object.assign(category, body);
  const updatedCategory = await datasource.manager.save(category);

  return reply.code(200).send(
    success(request.t("category.update.success"), {
      id: updatedCategory.id,
      name: updatedCategory.name,
      type: updatedCategory.type,
      categoryStatus: updatedCategory.categoryStatus,
    }),
  );
};

export const deleteCategory = async (
  request: FastifyRequest<{ Params: CategoryParams }>,
  reply: FastifyReply,
) => {
  const params = validateAndThrowError<CategoryParams>(
    categoryIdParamSchema,
    request.params,
    request.t,
  );
  const userId = checkNotNullUserId(request);
  const datasource = getAppDataSource();

  const category = await datasource.manager.findOneBy(Category, {
    id: params.id,
    userId,
    categoryStatus: true,
  });

  if (!category) {
    throw new AppError(404, request.t("category.notFound"));
  }

  category.categoryStatus = false;
  await datasource.manager.save(category);

  return reply.code(200).send(success(request.t("category.delete.success")));
};
