export interface IErrorHandlerService {
  parseError(error: unknown): { code: string; message: string; retryable: boolean };
  isNetworkError(error: unknown): boolean;
}
