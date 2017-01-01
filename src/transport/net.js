let Events = require('events');
let debug = require('debug')('minidsp:transport:net');
const net = require('net');
const binary = require('binary');

class NetTransport extends Events {
	constructor({ host, port = 5333 } = {}) {
		super();
		let self = this;

		debug(`Connecting to ${host}:${port}`);

		this.connection = net.createConnection({ host, port }, () => {
			debug('Connection established');
		});

		binary.stream(this.connection)
			.loop(function () {
				 this.peek(function() {
			        this.word8u('size');
			    })
				.buffer('data', 'size')
				.tap(function(vars) {
					debug('fromRemoteClient', vars.data);
					self.emit('data', vars.data);
			    });
			});
	}

	static probe() {
		throw new Error('Probing is not supported when using the network transport');
	}

	write(data) {
		debug('write', data);
		this.connection.write(data);
	}

	close() {
		debug('close');
		this.connection.destroy();
	}
}

module.exports = NetTransport;
