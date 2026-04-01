import { Controller, Get } from '@nestjs/common';
import { Message } from './common/decorators/message.decorator';

@Controller()
export class AppController {
  @Get('health')
  @Message('Servicio disponible')
  health() {
    return { status: 'ok', service: 'backend-nekofix' };
  }
}
