
import { socket } from '../socket';


export default function GameRoom({ room, myId }) {
    const isHost = room.players.find(p => p.id === myId)?.isHost;
    const me = room.players.find(p => p.id === myId);
    if (!me) return <div>Sincronizando jugador...</div>;
    const myRole = room.myRole;
    const myWord = room.myWord;
    const handleStart = () => {
        socket.emit('start_game', { roomCode: room.roomCode });
    };

    const handleVote = (targetId) => {
        socket.emit('vote', { roomCode: room.roomCode, voterId: myId, targetId });
    };

    const handleRestart = () => {
        socket.emit('restart_game', { roomCode: room.roomCode });
    };

    const copyCode = () => {
        navigator.clipboard.writeText(room.roomCode);
        alert('Código copiado!');
    };

    if (room.gameState === 'LOBBY') {
        return (
            <div className="w-full max-w-2xl p-8">
                <div className="text-center mb-10">
                    <h2 className="text-2xl text-game-muted font-light mb-2">CÓDIGO DE SALA</h2>
                    <div
                        onClick={copyCode}
                        className="text-6xl font-black tracking-widest cursor-pointer hover:text-game-primary transition-colors font-mono select-all"
                    >
                        {room.roomCode}
                    </div>
                    <p className="text-xs text-game-muted mt-2">Click para copiar</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                    {room.players.map(p => (
                        <div key={p.id} className="p-4 bg-game-card rounded-xl border border-game-muted/20 flex items-center justify-between">
                            <span className="font-semibold">{p.name} {p.id === myId && '(Tú)'}</span>
                            {p.isHost && <span className="text-xs px-2 py-1 bg-game-warning/20 text-game-warning rounded">HOST</span>}
                        </div>
                    ))}
                </div>
                <p>Debe haber al menos 3 jugadores </p>
                {isHost ? (
                    <button
                        onClick={handleStart}
                        disabled={room.players.length < 3}
                        className="w-full py-4 bg-game-primary text-white text-xl font-bold rounded-xl shadow-lg shadow-game-primary/30 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {room.players.length < 3 ? 'Esperando jugadores ...' : 'COMENZAR PARTIDA'}
                    </button>

                ) : (
                    <div className="text-center text-game-muted animate-pulse">
                        Esperando a que el anfitrión inicie...
                    </div>
                )}
            </div>
        );
    }

    if (room.gameState === 'PLAYING') {
        const alivePlayers = room.players.filter(p => !p.isDead && p.id !== myId);

        return (
            <div className="w-full max-w-4xl p-4 flex flex-col md:flex-row gap-8">
                {/* Role Card */}
                <div className="flex-1">
                    <div className="bg-game-card p-8 rounded-2xl border-2 border-game-primary/20 text-center shadow-xl mb-6">
                        <h3 className="text-game-muted uppercase tracking-widest text-sm mb-4">Tu Rol</h3>
                        <div className="text-4xl font-extrabold mb-2 text-white">
                            {myRole === 'impostor' ? '👻 IMPOSTOR' : 'detective CIUDADANO'}
                        </div>
                        <div className="mt-8 p-6 bg-game-bg rounded-xl border border-game-muted/30">
                            <p className="text-game-muted text-sm mb-2">Tu palabra secreta es:</p>
                            <p className="text-3xl font-mono text-game-accent">{myWord || '???'}</p>
                            {myRole === 'citizen' && (
                                <p className="text-xs text-game-muted mt-4">Categoría: {room.category}</p>
                            )}
                        </div>
                        {myRole === 'impostor' && (
                            <p className="text-sm text-game-muted mt-4 p-2 bg-game-accent/10 rounded">
                                Intenta pasar desapercibido y adivinar la palabra de los demás.
                            </p>
                        )}
                    </div>
                </div>

                {/* Voting Area */}
                <div className="flex-1">
                    <h3 className="text-xl font-bold mb-4">Votar para eliminar</h3>
                    {me.isDead ? (
                        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-xl text-center text-red-400">
                            Estás muerto. No puedes votar.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {alivePlayers.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => handleVote(p.id)}
                                    disabled={me.votedFor}
                                    className={`p-4 rounded-xl border flex justify-between items-center transition-all ${me.votedFor === p.id
                                        ? 'bg-game-primary text-white border-game-primary'
                                        : 'bg-game-card border-game-muted/30 hover:bg-game-card/80 hover:border-game-primary/50'
                                        }`}
                                >
                                    <span className="font-bold">{p.name}</span>
                                    {me.votedFor === p.id && <span>VOTADO</span>}
                                </button>
                            ))}
                            {me.votedFor && (
                                <p className="text-center text-game-muted text-sm mt-4 animate-pulse">
                                    Esperando a los demás votos...
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (room.gameState === 'RESULTS') {
        const results = room.results;
        const isWinner = (results.winner === 'CITIZENS' && myRole === 'citizen') ||
            (results.winner === 'IMPOSTOR' && myRole === 'impostor');

        return (
            <div className="text-center">
                <h1 className="text-6xl font-black mb-4">
                    {isWinner ? <span className="text-game-success">VICTORIA</span> : <span className="text-game-accent">DERROTA</span>}
                </h1>
                <p className="text-2xl text-white mb-2">
                    Ganaron los {results.winner === 'CITIZENS' ? 'Ciudadanos' : 'Impostores'}
                </p>
                {results.reason && <p className="text-game-muted mb-8">{results.reason}</p>}

                <div className="bg-game-card p-6 rounded-xl border border-game-muted/20 inline-block text-left mb-8">
                    <p>👻 El Impostor era: <span className="font-bold text-white">{results.impostorName}</span></p>
                    <p>💀 Eliminado: <span className="font-bold text-white">{results.eliminatedName}</span></p>
                </div>

                {isHost && (
                    <button
                        onClick={handleRestart}
                        className="block w-full max-w-sm mx-auto py-3 px-6 bg-game-primary hover:bg-game-primary/80 rounded-lg font-bold text-white transition-all"
                    >
                        Jugar de Nuevo
                    </button>
                )}
            </div>
        );
    }

    return <div>Cargando...</div>;
}
