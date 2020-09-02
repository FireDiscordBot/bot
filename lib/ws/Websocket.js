const Client = require('ws');
const EventHandler = require('./event/EventHandler');
const MessageUtil = require('./util/MessageUtil');
const Message = require('./Message');
const { IDENTIFY_CLIENT } = require('./util/constants').types;

class Websocket extends Client {

	constructor(client) {
		super(`${process.env.WS_URL}`);
		this.client = client;
		this.handler = new EventHandler(client);
		this.on('open', () => {
			this.send(MessageUtil.encode(new Message(IDENTIFY_CLIENT, { id: this.client.id, ready: this.client.client.ready || false })));
			this.client.client.console.log('[Aether] Sending identify event.');
		});
	}

	init() {
		this.handler.init();

		this.on('message', message => {
			this.handler.handle(message);
		});
	}

}

module.exports = Websocket;
