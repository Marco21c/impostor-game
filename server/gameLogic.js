const rooms = {};

const WORDS_DATA = {
    "Lugares": ["Hospital", "Escuela", "Playa", "Avión", "Supermercado", "Banco", "Cine", "Restaurante", "Circo", "Estación Espacial"],
    "Comida": ["Pizza", "Hamburguesa", "Sushi", "Tacos", "Helado", "Chocolate", "Ensalada", "Paella"],
    "Animales": ["Perro", "Gato", "Elefante", "León", "Tiburón", "Águila", "Pingüino", "Serpiente"]
};

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function joinRoom(roomCode, playerName, socketId) {
    if (!roomCode) {
        // Create new room
        roomCode = generateRoomCode();
        rooms[roomCode] = {
            id: roomCode,
            players: [],
            gameState: 'LOBBY', // LOBBY, PLAYING, RESULTS
            word: null,
            impostorId: null,
            category: null,
            votes: {},
            history: [], // who played what
            chat: []
        };
    } else {
        roomCode = roomCode.toUpperCase();
        if (!rooms[roomCode]) {
            return { error: "Room not found" };
        }
        if (rooms[roomCode].gameState !== 'LOBBY') {
            return { error: "Game already in progress" };
        }
    }

    const room = rooms[roomCode];
    if (room.players.some(p => p.name === playerName)) {
        // Handle name collision or reconnect? For MVP just add number
        playerName = playerName + "_" + Math.floor(Math.random() * 100);
    }

    room.players.push({
        id: socketId,
        name: playerName,
        isHost: room.players.length === 0,
        role: null, // 'impostor' or 'citizen'
        isDead: false,
        votedFor: null
    });

    return { roomCode };
}

function startGame(roomCode) {
    const room = rooms[roomCode];
    if (!room) return { error: "Room not found" };
    if (room.players.length < 3) return { error: "Need at least 3 players" }; // MVP rule

    // Pick Category and Word
    const categories = Object.keys(WORDS_DATA);
    const category = categories[Math.floor(Math.random() * categories.length)];
    const words = WORDS_DATA[category];
    const word = words[Math.floor(Math.random() * words.length)];

    room.category = category;
    room.word = word;
    room.gameState = 'PLAYING';
    room.votes = {};
    room.chat = [];

    // Assign Roles
    const impostorIndex = Math.floor(Math.random() * room.players.length);
    room.impostorId = room.players[impostorIndex].id;

    room.players.forEach((p, idx) => {
        p.role = (idx === impostorIndex) ? 'impostor' : 'citizen';
        p.secretWord = (idx === impostorIndex) ? 'IMPOSTOR' : word;
        p.votedFor = null;
        p.isDead = false;
    });
    return {
        players: room.players.map(p => ({
            id: p.id,
            role: p.role,
            word: p.secretWord,
            isBot: p.isBot
        }))
    };
}

function generateBotVotes(roomCode) {
    const room = rooms[roomCode];
    if (!room) return [];

    const votes = [];
    room.players
        .filter(p => p.isBot && !p.isDead)
        .forEach(bot => {
            const targets = room.players.filter(
                p => p.id !== bot.id && !p.isDead
            );
            if (targets.length > 0) {
                const target = targets[Math.floor(Math.random() * targets.length)];
                votes.push({ voterId: bot.id, targetId: target.id });
            }
        });
    return votes;
}

function addBotsToRoom(roomCode, count = 3) {
    const room = rooms[roomCode];
    if (!room) return;

    for (let i = 0; i < count; i++) {
        room.players.push({
            id: `BOT_${Date.now()}_${i}`,
            name: `Bot 🤖 ${i + 1}`,
            isBot: true,
            role: null,
            secretWord: null,
            votedFor: null,
            isDead: false
        });
    }
}

function handleVote(roomCode, voterId, targetId) {
    const room = rooms[roomCode];
    if (!room || room.gameState !== 'PLAYING') return {};

    const voter = room.players.find(p => p.id === voterId);
    if (!voter || voter.isDead) return {};

    voter.votedFor = targetId;

    // Check if everyone voted (alive players)
    const alivePlayers = room.players.filter(p => !p.isDead);
    const votesCast = alivePlayers.filter(p => p.votedFor).length;

    if (votesCast === alivePlayers.length) {
        // Tally votes
        const voteCounts = {};
        alivePlayers.forEach(p => {
            const target = p.votedFor;
            voteCounts[target] = (voteCounts[target] || 0) + 1;
        });

        // Find max
        let maxVotes = 0;
        let candidate = null;
        for (const [pid, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) {
                maxVotes = count;
                candidate = pid;
            } else if (count === maxVotes) {
                candidate = null; // Tie
            }
        }

        if (candidate) {
            // Player eliminated
            const eliminated = room.players.find(p => p.id === candidate);
            eliminated.isDead = true;

            // Win Condition
            const impostor = room.players.find(p => p.role === 'impostor');
            if (eliminated.role === 'impostor') {
                // Citizens Win
                room.gameState = 'RESULTS';
                return {
                    gameOver: true,
                    results: { winner: 'CITIZENS', impostorName: impostor.name, eliminatedName: eliminated.name }
                };
            }

            // A Citizen was eliminated
            const remainingPlayers = room.players.filter(p => !p.isDead);

            if (remainingPlayers.length <= 2) {
                // Impostor Wins (Impostor + 1 Citizen left)
                room.gameState = 'RESULTS';
                return {
                    gameOver: true,
                    results: { winner: 'IMPOSTOR', impostorName: impostor.name, eliminatedName: eliminated.name, reason: "Impostor survived until the end" }
                };
            }

            // Continue to Next Round
            // Reset votes
            room.players.forEach(p => p.votedFor = null);
            room.votes = {}; // Clear vote map

            return {
                update: true,
                nextRound: true, // Signal to trigger bots again
                gameState: getRoomState(roomCode),
                message: `${eliminated.name} was eliminated. The game continues!`
            };
        } else {
            // Tie - Re-vote
            room.players.forEach(p => p.votedFor = null);
            room.votes = {};

            return {
                update: true,
                nextRound: true, // Signal to trigger bots again (it's a re-vote)
                gameState: getRoomState(roomCode),
                message: "Tie! Vote again."
            };
        }
    }

    return { update: true, gameState: getRoomState(roomCode) };
}

function handleChat(roomCode, playerId, message) {
    const room = rooms[roomCode];
    if (!room) return null;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return null;

    const msg = {
        id: Date.now() + Math.random(),
        playerId,
        playerName: player.name,
        text: message,
        isDead: player.isDead,
        timestamp: Date.now()
    };

    room.chat.push(msg);
    if (room.chat.length > 50) room.chat.shift(); // Keep last 50 messages

    return msg;
}

function removePlayer(socketId) {
    let affectedRoomCode = null;
    let roomIsEmpty = false;

    for (const code in rooms) {
        const room = rooms[code];
        const idx = room.players.findIndex(p => p.id === socketId);
        if (idx !== -1) {
            room.players.splice(idx, 1);
            if (room.players.length === 0) {
                delete rooms[code];
                roomIsEmpty = true;
            } else {
                // Assign new host if host left
                if (!room.players.some(p => p.isHost)) {
                    room.players[0].isHost = true;
                }
            }
            affectedRoomCode = code;
            break;
        }
    }
    return { roomCode: affectedRoomCode, newState: affectedRoomCode && rooms[affectedRoomCode] ? getRoomState(affectedRoomCode) : null, isEmpty: roomIsEmpty };
}

function restartGame(roomCode) {
    const room = rooms[roomCode];
    if (room) {
        room.gameState = 'LOBBY';
        room.word = null;
        room.impostorId = null;
        room.votes = {};
        room.players.forEach(p => {
            p.role = null;
            p.secretWord = null;
            p.votedFor = null;
            p.isDead = false;
        });
        room.chat = [];
    }
    return {};
}

function getRoomState(roomCode) {
    const room = rooms[roomCode];
    if (!room) return null;

    // Create public view (hide secrets)
    // Actually handled by sending specific data to specific sockets if needed.
    // But for global updates (player list), it's fine.
    // Secrets should be sent securely or filtered on client (but insecure).
    // For MVP, we send everything but filtering happens on client or here.
    // Better: Send filtered list.

    return {
        roomCode: room.id,
        players: room.players.map(p => ({
            id: p.id,
            name: p.name,
            isHost: p.isHost,
            isDead: p.isDead,
            votedFor: p.votedFor // Reveal who voted for whom? Only after?
        })),
        gameState: room.gameState,
        category: room.category, // Reveal category
        chat: room.chat
    };
}

function getInternalGameState(room) {
    return {
        // Same as getRoomState but maybe more info?
        ...getRoomState(room.id)
    };
}

module.exports = {
    joinRoom,
    startGame,
    handleVote,
    removePlayer,
    restartGame,
    getRoomState,
    addBotsToRoom,
    generateBotVotes,
    handleChat
};
