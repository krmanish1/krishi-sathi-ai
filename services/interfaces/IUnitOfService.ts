import type { IHttpService } from "./IHttpService";
import type { IAccountService } from "./IAccountService";
import type { IChatService } from "./IChatService";
import type { IErrorHandlerService } from "./IErrorHandlerService";

export interface IUnitOfService {
  HttpService: IHttpService;
  AccountService: IAccountService;
  ChatService: IChatService;
  ErrorHandlerService: IErrorHandlerService;
  http: IHttpService;
  account: IAccountService;
  chat: IChatService;
  errorHandler: IErrorHandlerService;
}
