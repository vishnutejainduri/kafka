import { Controller, Get, Query } from '@nestjs/common';
import { ConnectorsService } from './connectors.service';

@Controller('connectors')
export class  ConnectorsController {
  constructor(private connectorsService: ConnectorsService) {}

  @Get()
  async findAll (@Query('environment') environment: string) {
    return this.connectorsService.findAll(environment)
  }
}
