import { injectable } from 'inversify';
import type { IErrorHandlerService } from "./interfaces/IErrorHandlerService";
import { ApiError } from "@/shared/api/errors";

@injectable()
export class ErrorHandlerService implements IErrorHandlerService {
  parseError(error: unknown): { code: string; message: string; retryable: boolean } {
    if (error instanceof ApiError) {
      return { code: error.code, message: error.message, retryable: error.retryable };
    }
    if (error instanceof Error) {
      return { code: "UNKNOWN", message: error.message, retryable: false };
    }
    return { code: "UNKNOWN", message: "An unknown error occurred", retryable: false };
  }

  isNetworkError(error: unknown): boolean {
    if (error instanceof ApiError) {
      return error.status === 0 || error.status === 408;
    }
    return error instanceof TypeError && error.message === "Network request failed";
  }
}
