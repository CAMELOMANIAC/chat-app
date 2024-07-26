import { Module } from '@nestjs/common';
import { ChatController } from './chat/chat.controller';
import { EventsGateway } from './chat/chat.gateway';

@Module({
  imports: [],
  controllers: [ChatController], //라우터쪽은 컨트롤러 배열에
  providers: [EventsGateway], //소켓 통신은 프로바이더 배열에
})
export class AppModule {}
