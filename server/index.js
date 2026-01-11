const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createGameMsg, joinRoom, startGame, handleVote, removePlayer, restartGame, getRoomState } = require('./gameLogic');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for MVP
        methods: ["GET", "POST"]
    }
});

// Rooms state is managed in gameLogic, but we might keep socket-to-room mapping here or there.
// For simplicity, passing IO to gameLogic or handling events here.
// Let's handle events here and call gameLogic functions.

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', ({ roomCode, playerName }) => {
        const result = joinRoom(roomCode, playerName, socket.id);
        if (result.error) {
            socket.emit('error', result.error);
        } else {
            socket.join(result.roomCode);
            io.to(result.roomCode).emit('room_update', getRoomState(result.roomCode));
        }
    });

    socket.on('start_game', ({ roomCode }) => {
        const result = startGame(roomCode);
        if (result.error) {
            socket.emit('error', result.error);
        } else {
            io.to(roomCode).emit('game_started', result.gameState);
            io.to(roomCode).emit('room_update', getRoomState(roomCode));
        }
    });

    socket.on('vote', ({ roomCode, voterId, targetId }) => {
        const result = handleVote(roomCode, voterId, targetId);
        if (result.update) {
            io.to(roomCode).emit('game_update', result.gameState);
        }
        if (result.gameOver) {
            io.to(roomCode).emit('game_over', result.results);
        }
    });

    socket.on('restart_game', ({ roomCode }) => {
        const result = restartGame(roomCode);
        io.to(roomCode).emit('room_update', getRoomState(roomCode));
        io.to(roomCode).emit('game_reset');
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const { roomCode, newState, isEmpty } = removePlayer(socket.id);
        if (roomCode) {
            if (isEmpty) {
                // Room deleted in logic
            } else {
                io.to(roomCode).emit('room_update', newState);
            }
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
