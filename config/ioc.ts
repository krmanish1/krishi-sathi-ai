import { Container } from 'inversify';
import { TYPES } from './types';

import { HttpService } from '@/services/HttpService';
import type { IHttpService } from '@/services/interfaces/IHttpService';
import { AccountService } from '@/services/AccountService';
import type { IAccountService } from '@/services/interfaces/IAccountService';
import { ChatService } from '@/services/ChatService';
import type { IChatService } from '@/services/interfaces/IChatService';
import { ErrorHandlerService } from '@/services/ErrorHandlerService';
import type { IErrorHandlerService } from '@/services/interfaces/IErrorHandlerService';
import { UnitOfService } from '@/services/UnitOfService';
import type { IUnitOfService } from '@/services/interfaces/IUnitOfService';

const container = new Container();

container.bind<IHttpService>(TYPES.IHttpService).to(HttpService).inSingletonScope();
container.bind<IAccountService>(TYPES.IAccountService).to(AccountService).inSingletonScope();
container.bind<IChatService>(TYPES.IChatService).to(ChatService).inSingletonScope();
container.bind<IErrorHandlerService>(TYPES.IErrorHandlerService).to(ErrorHandlerService).inSingletonScope();
container.bind<IUnitOfService>(TYPES.IUnitOfService).to(UnitOfService).inSingletonScope();

export { container };
