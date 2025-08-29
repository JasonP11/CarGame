import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Store rooms
const rooms = {}; 
// rooms[roomId] = {
//    players: { socketId: { x, y, z, ... } },
//    names: { socketId: "PlayerName" }
// }

function findOrCreateRoom() {
    for (let roomId in rooms) {
        const playerCount = Object.keys(rooms[roomId].players).length;
        if (playerCount < 2) return roomId;
    }
    const newRoomId = `room_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    rooms[newRoomId] = { players: {}, names: {} };
    return newRoomId;
}

io.on('connection', socket => {
    console.log(`Player connected: ${socket.id}`);

    const roomId = findOrCreateRoom();
    socket.join(roomId);

    // Initialize player
    rooms[roomId].players[socket.id] = { x: 0, y: 0, z: 0 };
    rooms[roomId].names[socket.id] = "Waiting...";

    // Send initial player list
    io.to(roomId).emit("playerList", {
        players: rooms[roomId].players,
        names: rooms[roomId].names
    });

    // Register player name
    socket.on("registerName", ({ name }) => {
        if (!rooms[roomId] || !name) return;

        rooms[roomId].names[socket.id] = name;

        io.to(roomId).emit("playerList", {
            players: rooms[roomId].players,
            names: rooms[roomId].names
        });

        console.log(`Player ${socket.id} is now called "${name}" in ${roomId}`);
    });

    // Movement updates (merge, don't replace)
    socket.on('move', data => {
        if (!rooms[roomId] || !rooms[roomId].players[socket.id]) return;

        Object.assign(rooms[roomId].players[socket.id], data);

        socket.to(roomId).emit('playerMoved', {
            id: socket.id,
            ...data
        });
    });

    // Player won
    socket.on('playerWon', () => {
        console.log(`Player ${socket.id} won in ${roomId}`);
        io.to(roomId).emit('playerWon', { id: socket.id });
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete rooms[roomId].players[socket.id];
        delete rooms[roomId].names[socket.id];

        if (Object.keys(rooms[roomId].players).length === 0) {
            delete rooms[roomId];
        } else {
            io.to(roomId).emit("playerList", {
                players: rooms[roomId].players,
                names: rooms[roomId].names
            });
        }
    });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});