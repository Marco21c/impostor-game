import { io } from "socket.io-client";

// For MVP, assuming localhost:3001. In prod, this would be dynamic.
const URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

export const socket = io(URL, {
    autoConnect: false
});
