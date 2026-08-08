export type ApiResponse<T> = {
  message: string;
  data?: T;
};

export type ApiErrorResponse = {
  error: {
    message: string;
    statusCode: number;
    details?: {
      field: string;
      message: string;
    }[];
  };
};

export const success = <T>(message: string, data?: T): ApiResponse<T> => {
  const response: ApiResponse<T> = {
    message,
  };

  if (data !== undefined) {
    response.data = data;
  }

  return response;
};

export const fail = (
  message: string,
  statusCode: number,
  details?: {
    field: string;
    message: string;
  }[],
): ApiErrorResponse => {
  const error: ApiErrorResponse["error"] = {
    message,
    statusCode,
  };

  if (details !== undefined) {
    error.details = details;
  }

  return {
    error,
  };
};
