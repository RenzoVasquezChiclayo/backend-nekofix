import { SetMetadata } from '@nestjs/common';
import { RESPONSE_MESSAGE_KEY } from '../constants/metadata-keys';

export const Message = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);
