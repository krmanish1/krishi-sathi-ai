import { createContext } from 'react';
import { container } from '@/config/ioc';

const DependencyContext = createContext(container);
export default DependencyContext;
