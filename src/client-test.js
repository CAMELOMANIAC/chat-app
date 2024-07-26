// eslint-disable-next-line @typescript-eslint/no-var-requires
const io = require('socket.io-client');

// 서버 URL로 소켓 연결을 생성합니다.
const socket = io('http://localhost:3000');

const handleConnect = () => {
  // 연결이 성공적으로 이루어지면 콘솔에 메시지를 출력합니다.
  socket.on('connect', () => {
    console.log('서버에 연결되었습니다.');
  });
};
// 서버에 'message' 이벤트를 발생시킵니다.
process.stdin.on('data', (data) => {
  const input = data.toString().trim();
  socket.emit('message', input);
});

// 서버로부터 'message' 이벤트를 수신하면 콘솔에 메시지를 출력합니다.
socket.on('messageToClient', (data) => {
  console.log('서버로부터 메시지를 받았습니다:', data);
});

//연결되었는지 콘솔에 띄어주고 재시도
let connectCount = 0;
const countTimer = setInterval(() => {
  if (socket.connected === false) {
    handleConnect();
    console.log('서버와 연결이 끊겼습니다.');
    connectCount++;
  } else {
    socket.emit('join', 'room1');
    clearInterval(countTimer);
  }

  if (connectCount > 3) {
    clearInterval(countTimer);
    console.log('서버와 연결할 수 없습니다.');
  }
}, 1000);
