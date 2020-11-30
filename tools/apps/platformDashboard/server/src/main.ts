import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  const port = process.env.DEPLOYMENT_PORT || 8080;
  await app.listen(port);
  console.log('Listing on port ', port);
}
bootstrap();
