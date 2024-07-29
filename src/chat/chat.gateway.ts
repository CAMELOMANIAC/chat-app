import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: any): void {
    //this.server.emit('messageToClient', client.id + '님이 로그인 하셨습니다');
    client.on('join', (newRoom) => {
      // 클라이언트가 현재 참여하고 있는 모든 룸에서 나가게 합니다.
      const rooms = Array.from(client.rooms);
      rooms.forEach((room: string) => {
        if (room !== client.id) {
          this.server
            .to(room)
            .emit('messageToClient', `${client.id}님이 ${room}에서 나갔습니다`);
          client.leave(room);
        }
      });

      // 새로운 룸에 클라이언트를 추가합니다.
      client.join(newRoom);
      this.server
        .to(newRoom)
        .emit(
          'messageToClient',
          `${client.id}님이 ${newRoom}에 접속하였습니다`,
        );
    });

    client.on('disconnecting', () => {
      client.rooms.forEach((room: string) => {
        this.server
          .to(room)
          .emit('messageToClient', `${client.id}님이 채팅방에서 나갔습니다`);
      });
    });

    //저장된 마우스 포지션을 클라이언트에게 보내주도록 하는 타이머
    setInterval(() => {
      this.handleSendMousePosition();
    }, 5000);
  }

  handleDisconnect(client: any): void {
    this.server.emit('messageToClient', client.id + '님이 로그아웃 하셨습니다');
  }

  @SubscribeMessage('message')
  handleMessage(@ConnectedSocket() client, @MessageBody() payload: any): void {
    //client.emit('messageToClient',payload)

    client.rooms.forEach((room: string) => {
      //this.server.to(room).emit('messageToClient', payload);//server는 게이트웨이 서버 전부
      client.broadcast
        .to(room)
        .emit('messageToClient', client.id + '님의 메세지:' + payload); //broadcast속성은 발신자를 제외하고보냄
    });
  }
  private clients: Map<string, Map<string, any[]>> = new Map();

  @SubscribeMessage('mousePosition')
  handleMousePosition(
    @ConnectedSocket() client,
    @MessageBody() payload: any,
  ): void {
    const roomName = JSON.stringify(Array.from(client.rooms)[1]); //룸에 0번은 자기 자신이고 실제 룸은 하나밖에 없도록 했으므로 1번을 가져옴
    if (!roomName) {
      return;
    }
    // 룸의 값을 가져옵니다.
    let currentRoom = this.clients.get(roomName);
    if (!currentRoom) {
      currentRoom = new Map<string, any[]>();
      this.clients.set(roomName, currentRoom);
    }
    // 유저의 값을 가져옵니다.
    let currentUser = currentRoom.get(client.id);
    if (!currentUser) {
      currentUser = [];
      currentRoom.set(client.id, currentUser);
    }
    // 새로운 값으로 대체합니다.
    currentRoom.set(client.id, payload);

    // 업데이트된 배열을 다시 Map 객체에 설정합니다.
    this.clients.set(roomName, currentRoom);
    console.log(this.clients);
  }

  // 클라이언트에게 마우스 포지션을 보내주는 타이머의 콜백 메서드
  handleSendMousePosition() {
    if (this.clients.size === 0) return;
    // this.clients 맵 객체를 순환합니다.
    this.clients.forEach((roomMap) => {
      // 각 룸의 클라이언트에게 메시지를 보냅니다.
      roomMap.forEach((value, clientId) => {
        this.server
          .to(clientId)
          .emit('mousePostionToClient', Array.from(roomMap.entries()));
      });
    });
    this.clients.clear();
  }
}
