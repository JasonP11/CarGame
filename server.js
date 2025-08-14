const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static('public'));

const players = {};

io.on('connection', socket => {
  console.log(`Player connected: ${socket.id}`);

  // Initialize player position
  players[socket.id] = { x: 0, y: 0, z: 0 };

  // Log current players for new join
  console.log("All players:", players);

  // Listen for movement updates
/*   socket.on('move', data => {
    players[socket.id] = data;

    console.log(`📍 Player ${socket.id}: x=${data.x}, y=${data.y}, z=${data.z}`);
  });
 */
  socket.on('move', data => {
  players[socket.id] = data;

  console.log(`📍 Player ${socket.id}: x=${data.x}, y=${data.y}, z=${data.z}`);

  // Broadcast to all other clients
  socket.broadcast.emit('playerMoved', {
        id: socket.id,
        x: data.x,
        y: data.y,
        z: data.z,
        vx: data.vx,
        vy: data.vy,
        vz: data.vz,
        qx: data.qx,
        qy: data.qy,
        qz: data.qz,
        qw: data.qw
  });
  });

  socket.on('playerWon', () => {
  console.log(`Player ${socket.id} has Won`);
  });


  // On disconnect, remove player
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
  });
});

server.listen(3000, () => {
  console.log('✅ Server running at http://localhost:3000');
});
