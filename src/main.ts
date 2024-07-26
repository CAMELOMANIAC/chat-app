declare const module: any; // hot reload 관련 추가 코드
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CustomIoAdapter } from './CustomIoAdapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // CORS 설정 추가
  app.enableCors({
    origin: 'http://localhost:3001', // 허용할 도메인
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // 허용할 HTTP 메서드
    credentials: true, // 자격 증명 허용
  });

  // Socket.IO 어댑터 설정
  app.useWebSocketAdapter(new CustomIoAdapter(app));

  // hot reload 관련 추가 코드
  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
  await app.listen(3000);
}
bootstrap();
