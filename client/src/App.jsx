import { useState, useEffect } from 'react';
import { socket } from './socket';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [room, setRoom] = useState(null); // { roomCode, players, gameState, ... }
  const [error, setError] = useState("");

  useEffect(() => {
    socket.connect();

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onRoomUpdate(value) {
      // value contains roomCode, players list, gameState
      setRoom(prev => ({ ...(prev || {}), ...value }));
      setError("");
    }

    function onGameStarted(gameState) {
      setRoom(prev => ({ ...prev, gameState: 'PLAYING', ...gameState }));
    }

    function onGameUpdate(gameState) {
      setRoom(prev => ({ ...prev, ...gameState }));
    }

    function onGameReset() {
      setRoom(prev => ({ ...prev, gameState: 'LOBBY', word: null, impostorId: null, votes: {} }));
    }

    function onGameOver(results) {
      setRoom(prev => ({ ...prev, gameState: 'RESULTS', results }));
    }

    function onError(msg) {
      setError(msg);
      setTimeout(() => setError(""), 3000);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room_update', onRoomUpdate);
    socket.on('game_started', onGameStarted);
    socket.on('game_update', onGameUpdate);
    socket.on('game_reset', onGameReset);
    socket.on('game_over', onGameOver);
    socket.on('error', onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room_update', onRoomUpdate);
      socket.off('game_started', onGameStarted);
      socket.off('game_update', onGameUpdate);
      socket.off('game_reset', onGameReset);
      socket.off('game_over', onGameOver);
      socket.off('error', onError);
      socket.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-game-bg text-game-text flex flex-col items-center justify-center p-4">
      {error && (
        <div className="fixed top-4 bg-game-accent text-white px-4 py-2 rounded shadow-lg animate-bounce z-50">
          {error}
        </div>
      )}

      {!room ? (
        <Lobby />
      ) : (
        <GameRoom room={room} myId={socket.id} />
      )}
    </div>
  );
}

export default App;
