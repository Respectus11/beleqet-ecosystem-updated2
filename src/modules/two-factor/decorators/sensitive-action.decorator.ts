import { SetMetadata } from '@nestjs/common';

export const SENSITIVE_ACTION_KEY = 'sensitive_action';
export const SensitiveAction = () => SetMetadata(SENSITIVE_ACTION_KEY, true);
