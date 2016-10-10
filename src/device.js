const Constants = require('./constants');
const USBTransport = require('./usbtransport');
let debug = require('debug')('minidsp:device');

class Device {
	constructor(options = {}) {
		if (options.transport) {
			this.transport = options.transport;
		} else {
			this.transport = new USBTransport(options);
		}
	}

	close() { 
		this.transport.close();
	}

	crc(data) {
		// Sum the data
		let sum = data.reduce((a,b) => a + b);

		/* jshint bitwise:false */
		// Truncate to one byte
		sum = sum & 0xFF; 

		return sum;
	}

	/**
	 * Sends a command to the board
	 * Commands are formatted using the following structure:
	 * [U8 length] [ command ] [U8 crc]
	 * This method only expects the command and computes the rest
	 */
	sendCommand(command) {
		if (!(command instanceof Buffer)) {
			command = new Buffer(command);
		}

		let data = new Buffer(1 + command.length + 1);

		// The sent length excludes the header, but includes the CRC byte
		data.writeUInt8(command.length + 1, 0);
		command.copy(data, 1);
		data.writeUInt8(this.crc(data.slice(0,data.length-1)), data.length - 1);

		let ret = new Promise((resolve) => {
			this.transport.once('data', (data) => resolve(data));
		});

		this.transport.write(data);

		return ret;
	}

	_getMasterStatus() {
		return this.sendCommand([ 0x05, 0xFF, 0xDA, 0x02 ]).then((data) => {
			// Expecting response: 05 ff da 00 00 where 
			if (data.slice(0, 3).compare(Buffer.from([ 0x05, 0xFF, 0xDA ])) !== 0) {
				throw new Error('Unexpected response ' + data);
			}

			// Convert back to dB
			return {
				volume: -2 * data.readUInt8(3),
				mute: !!data.readUInt8(4)
			};
		});
	}

	getVolume() {
		return this._getMasterStatus().then((status) => status.volume);
	}

	setVolume(value) {
		debug('setVolume', value);
		// The data is encoded at twice is value, then sent as positive.
		// For example: -20 dB is sent as 40
		// -1 dB is sent as 2
		// -0.5dB is sent as 1
		// The value MUST be between -127dB and 0dB

		/* jshint bitwise:false */
		value = Math.floor(Math.abs(value) * 2) & 0xFF;

		return this.sendCommand([ 0x42, value]);
	}

	setMute(value) {
		return this.sendCommand([ 0x17, value ? 0x01 : 0x00 ]);
	}

	getMute() {
		return this._getMasterStatus().then((status) => status.mute); 
	}

	/**
	 * Sets the input
	 * Analog: 0
	 * TOSLink: 1
	 * USB: 2
	 */
	setInput(value) {
		debug('setInput', value);
		if (typeof value === 'string') {
			const inputs = {
				analog: Constants.INPUT_ANALOG,
				toslink: Constants.INPUT_TOSLINK,
				usb: Constants.INPUT_USB
			};

			value = inputs[value.toLowerCase()];

			if (!value) {
				throw new Error('No such input');
			}
		}
		return this.sendCommand([ 0x34, value ]);
	}

	getInputLevels() {
		return this.sendCommand([ 0x14, 0x00, 0x44, 0x02 ]).then((data) => {
			if (data.slice(0, 3).compare(Buffer.from([ 0x14, 0x00, 0x44 ])) !== 0) {
				throw new Error('Unexpected response ' + data);
			}

			return [ data.readFloatLE(3), data.readFloatLE(7) ];
		});
	}

	getInput(index) {
		return new Input({ index, device: this });
	}
}


class Input {
	constructor({ index, device }) {
		this.index = index;
		this.device = device;
	}

	/**
	 * Sets this channel's mute flag
	 * @param {Boolean} value
	 */
	setMute(value) {
		let n = value ? 1 : 2;
		return this.device.sendCommand([ 0x13, 0x80, 0, this.index, n, 0, 0, 0 ]);
	}

	/**
	 * Sets the input gain for this channel
	 * @param {Float} value Gain value in dB
	 */
	setGain(value) {
		debug(`setGain(input ${this.index})`, value);

		const inputMap = {
			1: 0x1a,
			2: 0x1b
		};

		let cmd = Buffer.from([ 0x13, 0x80, 0, inputMap[this.index], 0, 0, 0, 0 ]);
		cmd.writeFloatLE(value, 4);
		return this.device.sendCommand(cmd);
	}

	get eq() {
		return new PEQ({ device: this.device });
	}
}

class PEQ {
	constructor({ address, unknown1, device }) {
		this.address = address;
		this.unknown1 = unknown1;
		this.device = device;
	}

	setBiquads(coeff) {
		if (coeff.length !== 5) {
			throw new Error('setBiquads needs 5 coefficients passed as an array');
		}

		let cmd = new Buffer(27);
		Buffer.from([ 0x30, 0x80 ]).copy(cmd);
		cmd.writeUint16LE(this.address, 2);
		cmd.writeUint16LE(this.unknown1, 4);

		for (let i = 0, j = 6; i < 5; i++, j += 4) {
			cmd.writeFloatLE(coeff[i], j);
		}

		return this.device.sendCommand(cmd);
	}
}

module.exports = Device;


