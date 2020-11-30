import { Module } from '@nestjs/common';
import { ConnectorsController } from './connectors.controller';
import { ConnectorsService } from './connectors.service';

@Module({
  controllers: [ConnectorsController],
  providers: [ConnectorsService],
})
export class ConnectorsModule {}
