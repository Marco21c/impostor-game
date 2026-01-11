import { useState, useRef, useEffect } from 'react';

export default function MusicPlayer() {
    // Default to muted/paused initially to avoid autoplay policy issues? 
    // Usually better to let user click to start, or try autoplay muted.
    // User wants a mute button. Let's assume they want it to play if possible.
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);
    const [hasInteracted, setHasInteracted] = useState(false);

    useEffect(() => {
        // Try to play on load (might fail due to browser policy)
        if (audioRef.current) {
            audioRef.current.volume = 0.3; // 30% volume default
            const playPromise = audioRef.current.play();

            if (playPromise !== undefined) {
                playPromise.then(() => {
                    setIsPlaying(true);
                }).catch(error => {
                    console.log("Autoplay prevented:", error);
                    setIsPlaying(false);
                });
            }
        }
    }, []);

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
        setHasInteracted(true);
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <audio ref={audioRef} loop src="/juego.mp3" />

            <button
                onClick={togglePlay}
                className={`p-3 rounded-full shadow-lg transition-all transform hover:scale-110 ${isPlaying
                        ? 'bg-game-primary text-white shadow-game-primary/40 animate-pulse-slow'
                        : 'bg-gray-800 text-gray-400 border border-gray-600'
                    }`}
                title={isPlaying ? "Silenciar música" : "Activar música"}
            >
                {isPlaying ? (
                    <span className="text-xl">🔊</span>
                ) : (
                    <span className="text-xl">🔇</span>
                )}
            </button>
        </div>
    );
}
