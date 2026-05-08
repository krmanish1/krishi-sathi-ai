import { injectable, inject } from 'inversify';
import { TYPES } from '@/config/types';
import type { IUnitOfService } from "./interfaces/IUnitOfService";
import type { IHttpService } from "./interfaces/IHttpService";
import type { IAccountService } from "./interfaces/IAccountService";
import type { IChatService } from "./interfaces/IChatService";
import type { IErrorHandlerService } from "./interfaces/IErrorHandlerService";

@injectable()
export class UnitOfService implements IUnitOfService {
  constructor(
    @inject(TYPES.IHttpService) public HttpService: IHttpService,
    @inject(TYPES.IAccountService) public AccountService: IAccountService,
    @inject(TYPES.IChatService) public ChatService: IChatService,
    @inject(TYPES.IErrorHandlerService) public ErrorHandlerService: IErrorHandlerService,
  ) {}

  get http(): IHttpService { return this.HttpService; }
  get account(): IAccountService { return this.AccountService; }
  get chat(): IChatService { return this.ChatService; }
  get errorHandler(): IErrorHandlerService { return this.ErrorHandlerService; }
}
