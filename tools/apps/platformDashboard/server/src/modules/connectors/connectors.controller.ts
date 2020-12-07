import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { TaskOperation, ConnectorsOperation } from './connectors.interface';
import { ConnectorsService } from './connectors.service';

@Controller('connectors')
export class ConnectorsController {
  constructor(private connectorsService: ConnectorsService) {}

  @Get()
  async findAll(@Query('environment') environment: string) {
    return this.connectorsService.findAll(environment);
  }

  @Post()
  async restartFailedTasks(
    @Query('environment') environment: string,
    @Query('operation') operation: ConnectorsOperation,
  ) {
    if (operation !== 'restartFailedTasks')
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    return this.connectorsService.restartFailedTasks(environment);
  }

  @Post(':connectorName/tasks/:taskId')
  async resetTask(
    @Param('connectorName') connectorName: string,
    @Param('taskId') taskId: string,
    @Query('operation') operation: TaskOperation,
    @Query('environment') environment: string,
  ) {
    if (operation !== 'restart')
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    return this.connectorsService.restart(environment, connectorName, taskId);
  }
}
