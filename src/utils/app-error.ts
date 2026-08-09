import { QueryFailedError } from "typeorm";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: {
      field: string;
      message: string;
    }[],
  ) {
    super(message);
  }
}

export class InvalidImageFileError extends Error {}
export class DeleteImageFileError extends Error {}

export const isBudgetUniqueViolation = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as {
    code?: string;
    constraint?: string;
  };

  return (
    driverError.code === "23505" &&
    driverError.constraint === "UQ_budget_user_category_period"
  );
};
