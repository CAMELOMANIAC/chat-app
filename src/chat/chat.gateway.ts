import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
export class EventsGateway implements OnGatewayConnection,OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: any, ...args: any[]): void {
    this.server.emit('messageToClient', client.id+'님이 로그인 하셨습니다');
    client.on('join', (room) => {
      client.join(room);
      this.server.to(room).emit('messageToClient', `${client.id}님이 ${room}에 접속하였습니다`);
    });

    client.on('disconnecting', () => {
      client.rooms.forEach((room:string) => {
          this.server.to(room).emit('messageToClient', `${client.id}님이 채팅방에서 나갔습니다`);
      });
  });
  }

  handleDisconnect(client: any, ...args: any[]): void {
    this.server.emit('messageToClient', client.id+'님이 로그아웃 하셨습니다');
  }

  @SubscribeMessage('message')
  handleMessage(@ConnectedSocket() client, @MessageBody() payload: any): void {
    console.log(payload,'받음')
    //client.emit('messageToClient',payload)

    client.rooms.forEach((room:string) => {
      //this.server.to(room).emit('messageToClient', payload);//server는 게이트웨이 서버 전부
      client.broadcast.to(room).emit('messageToClient', payload)//broadcast속성은 발신자를 제외하고보냄
  });
  }
}
