const Websocket = require('./Websocket');
const { IDLE, RECONNECTING } = require('./util/constants').states;

class Reconnector {

	constructor(client, timeout = 5000) {
		this.client = client;
		this.timeout = timeout;
		this.state = IDLE;
		this.interval = null;
	}

	handleOpen() {
		if (this.state === RECONNECTING) {
			clearInterval(this.interval);
			this.client.client.console.log('[Aether] Reconnected to Websocket.');
			this.state = IDLE;
		} else {
			this.client.client.console.log('[Aether] Connected to Websocket.');
		}
	}

	handleClose() {
		if (this.state === IDLE) {
			this.client.client.console.warn('[Aether] Disconnected from Websocket.');
			this.activate();
		}
	}

	handleError(error) {
		if (error.code === 'ECONNREFUSED') {
			if (this.state === IDLE) {
				this.activate();
			}
		} else {
			this.client.client.console.error(`[Aether] Received error event: ${error}`);
		}
	}

	activate() {
		clearInterval(this.interval);
		this.interval = setInterval(() => {
			this.reconnect();
		}, this.timeout);
	}

	reconnect() {
		this.client.client.console.log(`[Aether] Attempting to reconnect with ${this.timeout}ms timeout.`);
		this.state = RECONNECTING;
		this.client.ws = new Websocket(this.client);
		this.client.init();
	}

}

module.exports = Reconnector;
