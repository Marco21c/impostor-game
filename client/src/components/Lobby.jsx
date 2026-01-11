import { useState } from 'react';
import { socket } from '../socket';

export default function Lobby() {
    const [name, setName] = useState('');
    const [roomCode, setRoomCode] = useState('');

    const handleCreate = () => {
        if (!name) return alert('Por favor ingresa tu nombre');
        socket.emit('join_room', { roomCode: null, playerName: name });
    };

    const handleJoin = () => {
        if (!name || !roomCode) return alert('Ingresa nombre y código');
        socket.emit('join_room', { roomCode, playerName: name });
    };

    return (
        <div className="w-full max-w-md p-8 bg-game-card rounded-2xl shadow-2xl border border-game-primary/20 backdrop-blur-sm">
            <h1 className="text-4xl font-black text-center mb-8 bg-gradient-to-r from-game-primary to-game-accent bg-clip-text text-transparent">
                EL IMPOSTOR
            </h1>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-game-muted mb-2">Tu Nombre/Apodo</label>
                    <input
                        type="text"
                        className="w-full px-4 py-3 bg-game-bg rounded-lg border border-game-muted/30 focus:border-game-primary focus:ring-2 focus:ring-game-primary/50 outline-none transition-all text-game-text placeholder-game-muted/50"
                        placeholder="Ej. Detective"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-game-muted/20"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-game-card text-game-muted">Opciones</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <button
                        onClick={handleCreate}
                        className="w-full py-3 px-4 bg-gradient-to-r from-game-primary to-game-secondary hover:opacity-90 rounded-lg font-bold text-white shadow-lg shadow-game-primary/25 transition-all transform hover:-translate-y-0.5"
                    >
                        Crear Sala
                    </button>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="flex-1 px-4 py-3 bg-game-bg rounded-lg border border-game-muted/30 focus:border-game-primary outline-none uppercase text-center tracking-widest font-mono"
                            placeholder="CÓDIGO"
                            maxLength={5}
                            value={roomCode}
                            onChange={e => setRoomCode(e.target.value.toUpperCase())}
                        />
                        <button
                            onClick={handleJoin}
                            className="px-6 py-3 bg-game-card border border-game-primary text-game-primary hover:bg-game-primary hover:text-white rounded-lg font-bold transition-all"
                        >
                            Unirse
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
