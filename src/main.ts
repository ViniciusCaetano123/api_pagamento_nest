import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
async function bootstrap() {
  
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true, // ou '*', ou uma lista de origens ['http://localhost:3001']
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    // allowedHeaders: 'Content-Type, Accept, Authorization', // Pode ser necessário ajustar
  });
  app.setGlobalPrefix('dashboard_v1');  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
