const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { joinRoom, startGame, handleVote, removePlayer, restartGame, getRoomState } = require('./gameLogic');

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
            return;
        }

        const roomState = getRoomState(roomCode);

        // Estado general (sin secretos)
        io.to(roomCode).emit('room_update', roomState);

        // Datos privados por jugador
        result.players.forEach(player => {
            io.to(player.id).emit('game_started', {
                myRole: player.role,
                myWord: player.word
            });
        });
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
    socket.on('quick_game', () => {
        const roomCode = generateRoomCode(); // misma función que ya usás

        // Crear sala con el humano como host
        const result = joinRoom(roomCode, 'Jugador', socket.id);

        if (result.error) {
            socket.emit('error', result.error);
            return;
        }

        // Crear bots
        addBotsToRoom(roomCode, 3);

        socket.join(roomCode);

        // Emitir estado
        io.to(roomCode).emit('room_update', getRoomState(roomCode));

        // Arrancar juego automáticamente
        const startResult = startGame(roomCode);

        io.to(roomCode).emit('room_update', getRoomState(roomCode));

        // Enviar datos privados
        startResult.players.forEach(player => {
            if (!player.id.startsWith('BOT')) {
                io.to(player.id).emit('game_started', {
                    myRole: player.role,
                    myWord: player.word === 'IMPOSTOR' ? null : player.word
                });
            }
        });
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
