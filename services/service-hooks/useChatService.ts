import { container } from '@/config/ioc';
import { TYPES } from '@/config/types';
import type { IUnitOfService } from '@/services/interfaces/IUnitOfService';

export function useChatService() {
  const uos = container.get<IUnitOfService>(TYPES.IUnitOfService);
  return uos.ChatService;
}
