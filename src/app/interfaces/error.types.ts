export type TErrorDetail = {
  path: string | number;
  message: string;
};

export type TGenericErrorResponse = {
  statusCode: number;
  message: string;
  errorDetails: TErrorDetail[];
};
