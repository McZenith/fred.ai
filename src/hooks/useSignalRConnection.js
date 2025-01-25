import { useState, useCallback, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';

export const useSignalRConnection = () => {
  const [connection, setConnection] = useState(null);
  const [signalRData, setSignalRData] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  // Initialize connection
  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl('/livematchhub')
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);

    return () => {
      if (newConnection) {
        newConnection.stop();
      }
    };
  }, []);

  // Handle connection and message receiving
  useEffect(() => {
    if (!connection) return;

    // Set up message handler
    connection.on('ReceiveLiveMatches', (matches) => {
      console.log('Received matches:', matches?.length || 0);
      setSignalRData(matches || []);
    });

    // Start the connection
    const startConnection = async () => {
      try {
        await connection.start();
        console.log('SignalR Connected');
        setIsConnected(true);
        setError(null);
      } catch (err) {
        console.error('SignalR Connection Error:', err);
        setError(err);
        setIsConnected(false);
        // Retry connection after 5 seconds
        setTimeout(startConnection, 5000);
      }
    };

    // Handle connection changes
    connection.onclose(() => {
      setIsConnected(false);
      console.log('SignalR Disconnected');
    });

    connection.onreconnecting(() => {
      setIsConnected(false);
      console.log('SignalR Reconnecting...');
    });

    connection.onreconnected(() => {
      setIsConnected(true);
      console.log('SignalR Reconnected');
    });

    startConnection();

    // Cleanup on unmount
    return () => {
      if (connection) {
        connection.off('ReceiveLiveMatches');
        connection.stop();
      }
    };
  }, [connection]);

  // Manual reconnect function
  const reconnect = useCallback(async () => {
    if (!connection) return;

    try {
      await connection.stop();
      await connection.start();
      setIsConnected(true);
      setError(null);
      console.log('Manual reconnection successful');
    } catch (err) {
      console.error('Manual reconnection failed:', err);
      setError(err);
      setIsConnected(false);
    }
  }, [connection]);

  return {
    signalRData,
    isConnected,
    error,
    reconnect,
  };
};
