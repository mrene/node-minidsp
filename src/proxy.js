
const Events = require('events');
const debug = require('debug')('minidsp:proxy');
const Constants = require('./constants');
const net = require('net');
const binary = require('binary');

function createProxy({ transport }) {
	if (!transport) {
		throw new Error('Missing transport option');
	}

	let server = net.createServer((client) => {
		debug(`Connection established with ${client.remoteAddress}:${client.remotePort}`);
		// Parse the 1 byte non-inclusive length header
		binary.stream(client).loop(function (end, vars) {
		    this.peek(function() {
		        this.word8u('size');
		    })
			.tap((vars) => vars.size++)
			.buffer('data', 'size')
			.tap((vars) => {
				debug('fromClient', vars.data);
				transport.write(vars.data);
		    });
		});
		let listener = (data) => {
			debug('toClient', data);
			client.write(data);
		};
		transport.on('data', listener);
		let cleanup = () => {
			transport.removeListener('data', listener);
			debug('Connection closed');
		};
		client.on('end', cleanup);
		client.on('error', cleanup);
	});

	server.listen(5333);
}

module.exports = createProxy;
