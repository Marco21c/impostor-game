
import { useState, useEffect } from 'react';
import { socket } from '../socket';
import Chat from './Chat';


export default function GameRoom({ room, myId, onLeave }) {
    const isHost = room.players.find(p => p.id === myId)?.isHost;
    const me = room.players.find(p => p.id === myId);
    // ...
    const [timeLeft, setTimeLeft] = useState(30);

    useEffect(() => {
        if (room.endTime && room.gameState === 'PLAYING') {
            const interval = setInterval(() => {
                const now = Date.now();
                const diff = Math.ceil((room.endTime - now) / 1000);
                setTimeLeft(diff > 0 ? diff : 0);

                if (diff <= 0) clearInterval(interval);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [room.endTime, room.gameState]);

    if (!me) return <div>Sincronizando jugador...</div>;
    const myRole = room.myRole;
    const myWord = room.myWord;
    const [selectedCategory, setSelectedCategory] = useState("");

    const handleStart = () => {
        socket.emit('start_game', { roomCode: room.roomCode, category: selectedCategory });
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
        const categories = room.availableCategories || [];

        return (
            <div className="w-full max-w-2xl p-4 md:p-8 relative">
                <button
                    onClick={onLeave}
                    className="absolute top-2 left-2 md:top-8 md:left-8 text-game-muted hover:text-white transition-colors flex items-center gap-1"
                >
                    ⬅ Salir
                </button>

                <div className="text-center mb-6 md:mb-10">
                    <h2 className="text-xl md:text-2xl text-game-muted font-light mb-2">CÓDIGO DE SALA</h2>
                    {/* ... code ... */}
                    <div
                        onClick={copyCode}
                        className="text-4xl md:text-6xl font-black tracking-widest cursor-pointer hover:text-game-primary transition-colors font-mono select-all"
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

                {isHost && (
                    <div className="mb-8">
                        <label className="block text-game-muted text-sm mb-2 uppercase tracking-wider">Categoría</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedCategory("")}
                                className={`px-4 py-2 rounded-lg border transition-all ${selectedCategory === ""
                                    ? 'bg-game-accent text-game-bg border-game-accent font-bold'
                                    : 'bg-game-card border-game-muted/30 text-game-muted hover:border-game-accent/50'
                                    }`}
                            >
                                🎲 Aleatorio
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-lg border transition-all ${selectedCategory === cat
                                        ? 'bg-game-primary text-white border-game-primary font-bold'
                                        : 'bg-game-card border-game-muted/30 text-game-muted hover:border-game-primary/50'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <p className="text-center mb-4 text-game-muted">Min. 3 jugadores</p>
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
        const otherPlayers = room.players.filter(p => p.id !== myId);

        return (
            <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl p-4 items-start justify-center">

                {/* Main Game Area */}
                <div className="flex-1 flex flex-col md:flex-row gap-8 w-full">

                    {/* Role Card */}
                    <div className="flex-1">
                        <div className="bg-game-card p-8 rounded-2xl border-2 border-game-primary/20 text-center shadow-xl mb-6 relative overflow-hidden">
                            {/* Timer Overlay */}
                            <div className={`absolute top-0 right-0 p-3 rounded-bl-xl font-mono font-bold text-xl ${timeLeft <= 10 ? 'bg-red-600 text-white animate-pulse' : 'bg-game-surface text-game-primary'
                                }`}>
                                ⏱️ {timeLeft}s
                            </div>

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
                            {me.isDead && (
                                <div className="mt-6 p-4 bg-red-900/30 border border-red-500 rounded-xl text-red-500 font-bold animate-pulse">
                                    💀 HAS MUERTO (Modo Espectador)
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Voting Area */}
                    <div className="flex-1">
                        <h3 className="text-xl font-bold mb-4">Jugadores</h3>
                        {me.isDead ? (
                            <div className="p-4 bg-game-card border border-game-muted/30 rounded-xl text-center text-game-muted mb-4">
                                Ya no puedes votar, pero puedes ver el desarrollo de la partida.
                            </div>
                        ) : null}

                        <div className="grid grid-cols-1 gap-3">
                            {otherPlayers.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => !p.isDead && !me.isDead && handleVote(p.id)}
                                    disabled={me.votedFor || p.isDead || me.isDead}
                                    className={`p-4 rounded-xl border flex justify-between items-center transition-all ${p.isDead
                                        ? 'bg-red-900/20 border-red-900/50 opacity-70 cursor-not-allowed'
                                        : me.votedFor === p.id
                                            ? 'bg-game-primary text-white border-game-primary'
                                            : 'bg-game-card border-game-muted/30 hover:bg-game-card/80 hover:border-game-primary/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold ${p.isDead ? 'text-red-500 line-through' : 'text-game-text'}`}>
                                            {p.name}
                                        </span>
                                        {p.isDead && <span className="text-xs bg-red-900 text-red-200 px-2 py-0.5 rounded">MUERTO</span>}
                                    </div>

                                    {me.votedFor === p.id && !p.isDead && <span>VOTADO</span>}
                                </button>
                            ))}
                        </div>

                        {!me.isDead && me.votedFor && (
                            <p className="text-center text-game-muted text-sm mt-4 animate-pulse">
                                Esperando a los demás votos...
                            </p>
                        )}
                    </div>
                </div>

                {/* Chat Area - Sidebar */}
                <Chat roomCode={room.roomCode} myId={myId} initialMessages={room.chat} />

            </div>);
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

                <button
                    onClick={onLeave}
                    className="mt-6 text-game-muted hover:text-white transition-colors underline"
                >
                    Salir al Lobby Principal
                </button>
            </div>
        );
    }

    return <div>Cargando...</div>;
}
