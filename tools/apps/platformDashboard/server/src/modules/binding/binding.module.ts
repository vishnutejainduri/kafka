import { HttpModule, Module } from '@nestjs/common';
import { BindingService } from './binding.service';
import { BindingController } from './binding.controller';

@Module({
  imports: [HttpModule],
  providers: [BindingService,],
  controllers: [BindingController]
})
export class BindingModule {}
