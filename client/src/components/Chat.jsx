
import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';

export default function Chat({ roomCode, myId, initialMessages = [] }) {
    const [messages, setMessages] = useState(initialMessages);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    useEffect(() => {
        const onMessage = (msg) => {
            setMessages(prev => [...prev, msg]);
        };

        const onGameReset = () => {
            setMessages([]);
        };

        socket.on('chat_message', onMessage);
        socket.on('game_reset', onGameReset); // Listen for reset to clear chat
        socket.on('game_started', onGameReset); // Ideally clear on start too if we want fresh chat per game

        return () => {
            socket.off('chat_message', onMessage);
            socket.off('game_reset', onGameReset);
            socket.off('game_started', onGameReset);
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        socket.emit('send_message', { roomCode, message: input });
        setInput('');
    };

    return (
        <div className="flex flex-col h-80 md:h-[500px] w-full md:w-80 bg-game-card rounded-xl border border-game-muted/20 shadow-xl overflow-hidden mt-6 lg:mt-0">
            <div className="p-3 bg-game-primary/10 border-b border-game-muted/20">
                <h3 className="font-bold text-game-text text-sm uppercase tracking-wider">Chat de Sala</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {messages.length === 0 && (
                    <p className="text-center text-game-muted text-xs italic opacity-50 mt-4">
                        ¡Comienza la discusión! <br /> Debes ingresar una palabra y defenderla.
                    </p>
                )}
                {messages.map((msg) => {
                    const isMe = msg.playerId === myId;
                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className={`text-xs font-bold ${isMe ? 'text-game-primary' : 'text-game-accent'}`}>
                                    {msg.playerName}
                                </span>
                                {msg.isDead && <span className="text-[10px] bg-red-900 text-red-100 px-1 rounded">MUERTO</span>}
                            </div>
                            <div className={`px-3 py-2 rounded-lg text-sm max-w-[90%] break-words ${isMe
                                ? 'bg-game-primary text-white rounded-tr-none'
                                : 'bg-game-surface border border-game-muted/30 text-game-text rounded-tl-none'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-3 bg-game-surface border-t border-game-muted/20 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 bg-game-bg border border-game-muted/30 rounded-lg px-3 py-2 text-sm text-game-text focus:border-game-primary outline-none"
                    maxLength={100}
                />
                <button
                    type="submit"
                    disabled={!input.trim()}
                    className="bg-game-primary text-white p-2 rounded-lg hover:bg-game-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                </button>
            </form>
        </div>
    );
}
