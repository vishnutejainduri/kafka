import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ConnectorsModule } from './modules/connectors/connectors.module';
import { AuthorizationMiddleware } from './middlewares/authorization.middleware';
import { BindingModule } from './modules/binding/binding.module';

@Module({
  imports: [ConfigModule.forRoot(), ConnectorsModule, BindingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthorizationMiddleware).forRoutes('*');
  }
}
