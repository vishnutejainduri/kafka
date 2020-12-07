import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConnectorsModule } from './modules/connectors/connectors.module';
import { AuthorizationMiddleware } from './middlewares/authorization.middleware';
import { BindingModule } from './modules/binding/binding.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ConnectorsModule,
    BindingModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
      exclude: ['/api*'],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthorizationMiddleware).forRoutes('*');
  }
}
