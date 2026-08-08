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
