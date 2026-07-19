import React, { createContext, useContext, useEffect, useState } from 'react';
// import { io } from 'socket.io-client'; // Uncomment when backend is ready

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // const newSocket = io(import.meta.env.VITE_API_URL);
    // setSocket(newSocket);
    // return () => newSocket.close();
    
    // Mock for now
    setSocket({ connected: true, emit: () => {}, on: () => {} });
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);