export type ApiResponse<T> = {
  message: string;
  data?: T;
};

export type ApiErrorResponse = {
  error: {
    message: string;
    statusCode: number;
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

export const fail = (message: string, statusCode: number): ApiErrorResponse => {
  return {
    error: {
      message,
      statusCode,
    },
  };
};
