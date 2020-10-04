export enum EventType {
  IDENTIFY_CLIENT = 0,
  LAUNCH_CLIENT = 1,
  READY_CLIENT = 2,
  RECONNECT_CLIENT = 3,
  RESTART_CLIENT = 4,
  SEND_STATS = 5,
}

export enum WebsocketStates {
  CONNECTING = 0,
  CONNECTED = 1,
  CLOSING = 2,
  CLOSED = 3,
  RECONNECTING = 4,
  IDLE = 5,
}
