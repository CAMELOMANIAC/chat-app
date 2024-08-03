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
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: any): void {
    //this.server.emit('messageToClient', client.id + '님이 로그인 하셨습니다');
    client.on('join', (newRoom) => {
      // 다른룸에 join시 클라이언트가 현재 참여하고 있는 모든 룸에서 나가게 합니다.
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

    //연결이 끊어지기 전에 실행됩니다.
    client.on('disconnecting', () => {
      client.rooms.forEach((room: string) => {
        this.server
          .to(room)
          .emit('messageToClient', `${client.id}님이 채팅방에서 나갔습니다`);
      });
    });
  }

  //실제 연결이 끊어지면 실행됩니다.
  handleDisconnect(client: any): void {
    //this.server.emit('messageToClient', client.id + '님이 로그아웃 하셨습니다');
    this.clientsLastPostion.delete(client.id); //연결이 끊어진 클라이언트의 마지막 마우스 위치정보를 삭제합니다.
  }

  /**
   * 메세지를 받아서 룸에 있는 클라이언트에게 보내줍니다.
   *
   * @param {*} client
   * @param {*} payload
   */
  @SubscribeMessage('message')
  handleMessage(@ConnectedSocket() client, @MessageBody() payload: any): void {
    client.rooms.forEach((room: string) => {
      //this.server.to(room).emit('messageToClient', payload);//server는 게이트웨이 서버 전부
      client.broadcast
        .to(room)
        .emit('messageToClient', client.id + '님의 메세지:' + payload); //broadcast속성은 발신자를 제외하고보냄
    });
  }

  /** 클라이언트의 마우스 포지션을 저장하는 맵 객체 */
  private clients: Map<string, Map<string, any[]>> = new Map();
  private clientsLastPostion: Map<string, any[]> = new Map();
  timer: NodeJS.Timeout | null = null;

  /**
   * 마우스 포지션을 받아서 clients 맵객체에 저장합니다.
   *
   * @param {*} client - 클라이언트 객체
   * @param {*} payload - 클라이언트가 보낸 마우스 위치 정보가 담긴 객체
   */
  @SubscribeMessage('mousePosition')
  handleMousePosition(
    @ConnectedSocket() client,
    @MessageBody() payload: any,
  ): void {
    const roomName = Array.from(client.rooms)[1]; //룸에 0번은 자기 자신이고 클라이언트 룸은 단 하나만 join 하도록 했으므로 1번이 실제 위치한 유일한 룸이름
    if (!roomName || typeof roomName !== 'string') {
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
      //console.log(client.id, currentUser);
      currentUser = [];
      currentRoom.set(client.id, currentUser);
    }
    // 새로운 값으로 대체합니다.
    currentRoom.set(client.id, payload);

    // 업데이트된 배열을 다시 Map 객체에 설정합니다.
    this.clients.set(roomName, currentRoom);

    const rooms = this.findAllRooms();
    rooms.forEach((room) => {
      //룸에 있는 클라이언트들의 마지막 마우스 위치를 clientsLastPostion에 저장합니다.(클라이언트가 새 마우스 위치정보를 안보낼경우 대신 이걸 보내기위함)
      const mapToObj = Object.fromEntries(this.clients.get(roomName));
      room.forEach((clientId) => {
        if (mapToObj[clientId]) {
          const lastPostion = [
            mapToObj[clientId][mapToObj[clientId].length - 1],
          ];
          this.clientsLastPostion.set(clientId, lastPostion);
        }
      });

      //만약 룸에 있는 클라이언트 수와 클라이언트 맵 객체에 저장된 클라이언트 수가 같다면 즉시 마우스 위치를 보냅니다.
      if (room?.size === this.clients.get(roomName)?.size) {
        this.handleSendMousePosition();
        clearInterval(this.timer);
        this.timer = null;
      } else if (!this.timer) {
        //최초 메세지를 받은 이후 메세지가 모이지 않으면 다른 메세지를 대기하도록 타이머를 설정합니다.
        this.timer = setTimeout(() => {
          this.handleSendMousePosition();
          this.timer = null;
        }, 200);
      }
    });
  }

  /**각 클라이언트에게 마우스 위치를 보내주는 메서드 */
  handleSendMousePosition() {
    const rooms = this.findAllRooms();
    rooms.forEach((room) => {
      room.forEach((clientId) => {
        this.clients.forEach((roomMap) => {
          //클라이언트가 새로운 마우스 위치를 보내지 않았을 경우 마지막 마우스 위치를 보냅니다.
          for (const [key, value] of this.clientsLastPostion) {
            if (!roomMap.has(key)) {
              roomMap.set(key, value);
            }
          }

          this.server
            .to(clientId)
            .emit('mousePostionToClient', Object.fromEntries(roomMap));
        });
      });
    });
    this.clients.clear();
  }

  /**
   * 서버의 모든 룸을 반환합니다.
   *
   * @returns {Map<string, any>}
   */
  findAllRooms(): Map<string, any> {
    const rooms = this.server.sockets.adapter.rooms;
    const filteredRooms = new Map();

    rooms.forEach((clients, roomName) => {
      // 사용자 자신이 포함된 룸을 제외합니다.
      if (!clients.has(roomName)) {
        filteredRooms.set(roomName, clients);
      }
    });

    return filteredRooms;
  }
}
