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
            history: [] // who played what
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
            word: p.secretWord
        }))
    };
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

            const aliveCitizens = room.players.filter(p => !p.isDead && p.role === 'citizen');
            if (aliveCitizens.length <= 1) { // 1v1 impostor wins usually? or ratio. 
                // Impostor Wins
                room.gameState = 'RESULTS';
                return {
                    gameOver: true,
                    results: { winner: 'IMPOSTOR', impostorName: impostor.name, eliminatedName: eliminated.name }
                };
            }

            // Continue? Or just one round for MVP. Let's do One Round Kill for MVP simplification.
            // Usually Spyfall is: Vote -> If correct, Citizens win. If wrong, Impostor wins.
            // Im implementing: If wrong person voted out, Impostor Wins Instantly for MVP simplicity.
            room.gameState = 'RESULTS';
            return {
                gameOver: true,
                results: { winner: 'IMPOSTOR', impostorName: impostor.name, eliminatedName: eliminated.name, reason: "Wrong person voted out" }
            };
        } else {
            // Tie - No one eliminated? Or Re-vote?
            // Reset votes for MVP
            room.players.forEach(p => p.votedFor = null);
            return { update: true, gameState: getRoomState(roomCode) };
        }
    }

    return { update: true, gameState: getRoomState(roomCode) };
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
        category: room.category // Reveal category
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
    getRoomState
};
