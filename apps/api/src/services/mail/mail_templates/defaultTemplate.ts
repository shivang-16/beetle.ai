import { BaseMailOptions } from '../types.js';
import { baseTemplate } from './baseTemplate.js';

export const defaultTemplate = (options: BaseMailOptions) => {
  return baseTemplate(options.message || '');
};
