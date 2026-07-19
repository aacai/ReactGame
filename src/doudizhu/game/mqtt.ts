import mqtt, { MqttClient } from 'mqtt';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MQTTMessage {
  type: string;
  [key: string]: any;
}

type MessageHandler = (msg: MQTTMessage) => void;
type StatusCallback = (status: ConnectionStatus) => void;

const BROKER_URL = 'wss://s5ebe39b.ala.cn-hangzhou.emqxsl.cn:8084/mqtt';
const MQTT_USERNAME = 'xiangqi_player';
const MQTT_PASSWORD = 'xiangqi2024';

let client: MqttClient | null = null;
let status: ConnectionStatus = 'disconnected';
const topicHandlers = new Map<string, Set<MessageHandler>>();
const statusCallbacks = new Set<StatusCallback>();

function setStatus(newStatus: ConnectionStatus): void {
  if (status !== newStatus) {
    status = newStatus;
    statusCallbacks.forEach((cb) => cb(status));
  }
}

function generateClientId(): string {
  return `doudizhu_${Math.random().toString(36).slice(2, 10)}`;
}

export function connect(clientId?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (client) {
      if (status === 'connected') {
        resolve();
        return;
      }
      client.end(true);
      client = null;
    }

    setStatus('connecting');

    const id = clientId || generateClientId();

    try {
      client = mqtt.connect(BROKER_URL, {
        clientId: id,
        clean: true,
        reconnectPeriod: 3000,
        connectTimeout: 10000,
        username: MQTT_USERNAME,
        password: MQTT_PASSWORD,
      });

      client.on('connect', () => {
        setStatus('connected');
        topicHandlers.forEach((_, topic) => {
          if (client) {
            client.subscribe(topic, (err) => {
              if (err) {
                console.error('Failed to subscribe to topic:', topic, err);
              }
            });
          }
        });
        resolve();
      });

      client.on('error', (err) => {
        setStatus('error');
        reject(err);
      });

      client.on('reconnect', () => {
        setStatus('connecting');
      });

      client.on('close', () => {
        setStatus('disconnected');
      });

      client.on('message', (topic, message) => {
        const handlers = topicHandlers.get(topic);
        if (!handlers || handlers.size === 0) return;

        try {
          const parsed: MQTTMessage = JSON.parse(message.toString());
          handlers.forEach((handler) => handler(parsed));
        } catch (e) {
          console.error('Failed to parse MQTT message:', e);
        }
      });
    } catch (err) {
      setStatus('error');
      reject(err);
    }
  });
}

export function disconnect(): void {
  if (client) {
    client.end(true);
    client = null;
  }
  setStatus('disconnected');
  topicHandlers.clear();
}

export function subscribe(topic: string, handler: MessageHandler): void {
  if (!topicHandlers.has(topic)) {
    topicHandlers.set(topic, new Set());
    if (client && status === 'connected') {
      client.subscribe(topic, (err) => {
        if (err) {
          console.error('Failed to subscribe to topic:', topic, err);
        }
      });
    }
  }
  topicHandlers.get(topic)!.add(handler);
}

export function unsubscribe(topic: string): void {
  const handlers = topicHandlers.get(topic);
  if (!handlers) return;

  topicHandlers.delete(topic);
  if (client && status === 'connected') {
    client.unsubscribe(topic, (err) => {
      if (err) {
        console.error('Failed to unsubscribe from topic:', topic, err);
      }
    });
  }
}

export function publish(topic: string, message: MQTTMessage): void {
  if (!client || status !== 'connected') {
    console.warn('MQTT not connected, cannot publish message');
    return;
  }

  try {
    const payload = JSON.stringify(message);
    client.publish(topic, payload, (err) => {
      if (err) {
        console.error('Failed to publish message:', err);
      }
    });
  } catch (e) {
    console.error('Failed to stringify MQTT message:', e);
  }
}

export function getStatus(): ConnectionStatus {
  return status;
}

export function onStatusChange(callback: StatusCallback): () => void {
  statusCallbacks.add(callback);
  callback(status);
  return () => {
    statusCallbacks.delete(callback);
  };
}
