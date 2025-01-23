import * as signalR from '@microsoft/signalr';

const SIGNALR_CONFIG = {
  URL: '/livematchhub',
  RETRY_DELAYS: [0, 2000, 5000, 10000, 15000, 30000], // Extended retry delays
  LOG_LEVEL: signalR.LogLevel.Information,
  RECONNECT_INTERVAL: 5000,
  KEEP_ALIVE_INTERVAL: 15000,
  CLIENT_TIMEOUT_INTERVAL: 45000,
  SERVER_TIMEOUT: 60000,
  PING_INTERVAL: 5000,
  MAX_ATTEMPTS: 10, // Increased max attempts
  CLIENT_ID_KEY: 'signalr_client_id',
  CLIENT_ID_TIMESTAMP_KEY: 'signalr_client_id_timestamp',
  CLIENT_ID_EXPIRY: 24 * 60 * 60 * 1000,
};

const isClient = typeof window !== 'undefined';

class SignalRManager {
  constructor() {
    this.connection = null;
    this.clientId = null;
    this.pingTimer = null;
    this.lastPongTime = Date.now();
    this.isReconnecting = false;
    this.connectionAttempt = 0;
    this.messageHandler = null;
    this.setIsConnected = null;
    this.reconnectTimeoutId = null;
    this.autoReconnectEnabled = true;
  }

  initialize(setIsConnected) {
    this.setIsConnected = setIsConnected;
    this.updateConnectionState(false);
  }

  updateConnectionState(isConnected) {
    if (this.setIsConnected) {
      this.setIsConnected(isConnected);
    }
  }

  async getClientId() {
    if (!this.clientId) {
      const storedId = localStorage.getItem(SIGNALR_CONFIG.CLIENT_ID_KEY);
      const timestamp = localStorage.getItem(
        SIGNALR_CONFIG.CLIENT_ID_TIMESTAMP_KEY
      );

      const isExpired =
        !timestamp ||
        Date.now() - parseInt(timestamp, 10) > SIGNALR_CONFIG.CLIENT_ID_EXPIRY;

      if (!storedId || isExpired) {
        this.clientId = `client_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        localStorage.setItem(SIGNALR_CONFIG.CLIENT_ID_KEY, this.clientId);
        localStorage.setItem(
          SIGNALR_CONFIG.CLIENT_ID_TIMESTAMP_KEY,
          Date.now().toString()
        );
      } else {
        this.clientId = storedId;
      }
    }
    return this.clientId;
  }

  async connect(messageHandler) {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      console.log('Already connected');
      return this.connection;
    }

    if (this.isReconnecting) {
      console.log('Already attempting to reconnect...');
      return this.connection;
    }

    try {
      const clientId = await this.getClientId();
      this.messageHandler = messageHandler;

      if (this.connection) {
        await this.connection.stop();
        this.connection = null;
      }

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${SIGNALR_CONFIG.URL}?clientId=${clientId}`, {
          transport: signalR.HttpTransportType.WebSockets,
          skipNegotiation: true,
          headers: { 'X-Client-Id': clientId },
        })
        .withAutomaticReconnect(SIGNALR_CONFIG.RETRY_DELAYS)
        .configureLogging(SIGNALR_CONFIG.LOG_LEVEL)
        .build();

      // Set up connection event handlers
      connection.onreconnecting((error) => {
        console.warn('Connection lost, attempting to reconnect...', error);
        this.updateConnectionState(false);
        this.isReconnecting = true;
      });

      connection.onreconnected((connectionId) => {
        console.log('Reconnected successfully:', connectionId);
        this.updateConnectionState(true);
        this.isReconnecting = false;
        this.setupPingInterval(connection);
        this.subscribeToMatches(connection);
      });

      connection.onclose((error) => {
        console.warn('Connection closed:', error);
        this.updateConnectionState(false);
        this.stopPingInterval();
        if (this.autoReconnectEnabled) {
          this.scheduleReconnect();
        }
      });

      // Set up message handlers
      connection.on('ReceiveLiveMatches', (data) => {
        console.debug('Received matches:', data?.length || 0);
        if (this.messageHandler) {
          this.messageHandler(data);
        }
      });

      connection.on('Pong', () => {
        this.lastPongTime = Date.now();
        console.debug('Pong received');
      });

      connection.on('ForceReconnect', async () => {
        console.warn('Received force reconnect signal from server');
        await this.handleReconnect();
      });

      // Start the connection
      await connection.start();
      console.log('Connection established successfully');

      this.connection = connection;
      this.updateConnectionState(true);
      this.connectionAttempt = 0;

      // Setup ping interval and subscribe to matches
      this.setupPingInterval(connection);
      await this.subscribeToMatches(connection);

      return connection;
    } catch (error) {
      console.error('SignalR connection error:', error);
      this.updateConnectionState(false);

      if (this.autoReconnectEnabled) {
        this.scheduleReconnect();
      }

      throw error;
    }
  }

  async subscribeToMatches(connection) {
    try {
      await connection.invoke('SubscribeToMatches');
      console.log('Subscribed to matches successfully');
    } catch (error) {
      console.error('Error subscribing to matches:', error);
      throw error;
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    const delay = Math.min(1000 * Math.pow(2, this.connectionAttempt), 30000);
    this.reconnectTimeoutId = setTimeout(async () => {
      if (this.autoReconnectEnabled && !this.isReconnecting) {
        this.connectionAttempt++;
        await this.handleReconnect();
      }
    }, delay);
  }

  setupPingInterval(connection) {
    this.stopPingInterval();
    this.pingTimer = setInterval(() => {
      this.sendPing(connection);
    }, SIGNALR_CONFIG.PING_INTERVAL);
  }

  stopPingInterval() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  async handleReconnect() {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    console.log('Starting reconnection process');

    try {
      await this.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await this.connect(this.messageHandler);
    } catch (error) {
      console.error('Reconnection failed:', error);
      if (this.autoReconnectEnabled) {
        this.scheduleReconnect();
      }
    } finally {
      this.isReconnecting = false;
    }
  }

  async sendPing(connection) {
    try {
      const timeSinceLastPong = Date.now() - this.lastPongTime;

      if (timeSinceLastPong > SIGNALR_CONFIG.CLIENT_TIMEOUT_INTERVAL) {
        console.warn('Connection may be stale, initiating reconnection...');
        await this.handleReconnect();
        return;
      }

      if (connection?.state === signalR.HubConnectionState.Connected) {
        await connection.invoke('ClientPing');
        console.debug('Ping sent');
      }
    } catch (error) {
      console.warn('Ping failed:', error);
      await this.handleReconnect();
    }
  }

  async disconnect() {
    console.log('Starting SignalR disconnect...');
    this.autoReconnectEnabled = false;

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.connection) {
      try {
        if (this.connection.state === signalR.HubConnectionState.Connected) {
          try {
            await this.connection.invoke('UnsubscribeFromMatches');
            console.log('Unsubscribed from matches');
          } catch (error) {
            console.warn('Failed to unsubscribe:', error);
          }
        }

        this.stopPingInterval();
        await this.connection.stop();
        console.log('SignalR connection stopped');

        this.connection = null;
        this.isReconnecting = false;
        this.connectionAttempt = 0;
        this.updateConnectionState(false);
      } catch (error) {
        console.error('Error during disconnect:', error);
        this.cleanup();
      }
    } else {
      this.cleanup();
    }
  }

  cleanup() {
    this.stopPingInterval();
    this.connection = null;
    this.isReconnecting = false;
    this.connectionAttempt = 0;
    this.updateConnectionState(false);
  }

  onComponentUnmount() {
    console.log('Component unmounting, cleaning up SignalR...');
    this.disconnect();
  }
}

const signalRManager = isClient ? new SignalRManager() : null;

export default signalRManager;
