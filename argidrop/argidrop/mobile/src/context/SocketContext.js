import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const SocketContext = createContext(null);
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  const connect = async () => {
    const token = await SecureStore.getItemAsync('argidrop_token');
    if (!token || socketRef.current?.connected) return;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'], reconnection: true, reconnectionAttempts: 5 });
    socket.on('connect', () => { setConnected(true); console.log('🔌 Socket connected'); });
    socket.on('disconnect', () => { setConnected(false); });
    socketRef.current = socket;
    return socket;
  };

  const disconnect = () => { socketRef.current?.disconnect(); setConnected(false); };
  const getSocket = () => socketRef.current;
  const emit = (event, data) => socketRef.current?.emit(event, data);

  useEffect(() => { return () => disconnect(); }, []);

  return (
    <SocketContext.Provider value={{ connected, connect, disconnect, getSocket, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
