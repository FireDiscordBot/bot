export enum EventType {
  // N.B. Send only does not necessarily mean it cannot be received
  // but rather it is not expected to be received outside of
  // a response to it being sent, e.g. GOOGLE_ASSISTANT

  // Receive only however should never be sent

  IDENTIFY_CLIENT, // send only
  LAUNCH_CLIENT, // receive only
  READY_CLIENT, // send only
  RESTART_CLIENT, // receive only
  KILL_CLIENT, // receive only
  RESUME_CLIENT, // receive only
  HEARTBEAT, // send only
  HEARTBEAT_ACK, // receive only
  DEPLOY, // send & receive
  SEND_STATS, // send only
  REQUEST_STATS, // receive only
  UNUSED10 = 11,
  GUILD_CREATE, // send only
  GUILD_DELETE, // send only
  LOAD_MODULE, // send & receive
  BROADCAST_EVAL, // send & receive
  ADMIN_ACTION, // send only
  VANITY_REFRESH, // send only
  BLACKLIST_SYNC, // send & receive
  RELOAD_EXPERIMENTS, // send & receive
  UPDATE_STATE, // receive only
  REMINDER_SEND, // receive only
  REMINDER_CREATE, // send only
  REMINDER_DELETE, // send only
  CROSS_CLUSTER_QUOTE, // send & receive
  PREMIUM_SYNC, // receive only
  UPDATE_BLOCKGAMESOLUTIONS, // receive only
  PLAYWRIGHT_REQUEST, // send only
  REFRESH_COMMANDS, // send only
  FORWARD_MESSAGE, // receive only
  FORWARD_MESSAGE_USER, // receive only
  SUBMIT_APPEAL, // send & receive
  UNUSED5 = 32,
  UNUSED6 = 33,
  UNUSED7 = 34,
  UNUSED8 = 35,
  UNUSED9 = 36,
  CREATE_INVITE_DISCOVERABLE, // send only
  UNUSED4 = 38,
  DISCOVERY_UPDATE, // send only
  API_REQUEST, // receive only
  ALIAS_SYNC, // send & receive
  WRITE_INFLUX_POINTS, // send only
  SPECIAL_COUPON, // send only
  REFRESH_SLASH_COMMAND_IDS, // send & receive
  SET_CUSTOM_STATUS, // receive only
  UPDATE_SETTINGS, // send only
  INFLUX_QUERY, // send only
  GOOGLE_ASSISTANT, // send only
  UPDATE_GUILD_CONFIG, // receive only
  RETRIEVE_GUILD_CONFIG, // send only
  UPDATE_USER_CONFIG, // receive only
  RETRIEVE_USER_CONFIG, // send only
}

export enum WebsocketStates {
  CONNECTING,
  CONNECTED,
  CLOSING,
  CLOSED,
  RECONNECTING,
  IDLE,
}
