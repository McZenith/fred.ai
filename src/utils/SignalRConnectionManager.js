import * as signalR from '@microsoft/signalr';

class SignalRManager {
  constructor() {
    this.connection = null;
    this.url = '/livematchhub';
    this.isConnecting = false;
  }

  async connect() {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      console.log('Already connected');
      return this.connection;
    }

    if (this.isConnecting) {
      console.log('Connection in progress');
      return this.connection;
    }

    try {
      this.isConnecting = true;

      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(this.url)
        .withAutomaticReconnect()
        .build();

      await this.connection.start();
      console.log('SignalR connected successfully');

      return this.connection;
    } catch (error) {
      console.error('SignalR connection error:', error);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnect() {
    if (this.connection) {
      try {
        await this.connection.stop();
        this.connection = null;
        console.log('SignalR disconnected');
      } catch (error) {
        console.error('Error disconnecting SignalR:', error);
      }
    }
  }
}

// Create instance only if we're in a browser environment
const signalRManager =
  typeof window !== 'undefined' ? new SignalRManager() : null;

export default signalRManager;