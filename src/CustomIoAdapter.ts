import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

export class CustomIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: 'http://localhost:3001', // 허용할 도메인
        methods: ['GET', 'POST'], // 허용할 HTTP 메서드
        credentials: true, // 자격 증명 허용
      },
    });
    return server;
  }
}
