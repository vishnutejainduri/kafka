import { Controller, Get, Query } from '@nestjs/common';
import { BindingService } from './binding.service';

@Controller('binding')
export class BindingController {
  constructor(private bindingService: BindingService) {}

  @Get('configs')
  async getConfigs(@Query('environment') environment: string) {
    return this.bindingService.getConfigs(environment);
  }
}
