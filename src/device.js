let hid = require('node-hid');
let HID = hid.HID;
let Events = require('events');
const Constants = require('./constants');
let debug = require('debug')('minidsp:device');

class Device extends Events {
	constructor({ vid, pid } = { vid: Constants.USB_VID, pid: Constants.USB_PID }) {
		super();

		this.device = new HID(vid, pid);
		this.device.on('data', this.onData.bind(this));
	}

	onData(data) {
		// Response packets are all 64 bytes long, with the first byte
		// indicating the length
		if (!(data instanceof Buffer)) {
			data = new Buffer(data);
		}

		// Slice the message and only keep what's important
		// (the minidsp always sends 64 byte packets)
		let length = data.readUInt8(0);

		// Received packets length do not include the length header 
		data = data.slice(1, length);

		debug('onData', data);

		this.emit('data', data);
	}

	write(data) {
		debug('write', data);

		// Expand data to a 64 byte buffer, pad with 0xFF
		// Since hidapi wants the report id as the first byte, this is 
		// one byte longer than the actual data going down the write
		let sendBuffer = new Buffer(65);
		sendBuffer.writeUInt8(0,0); // Set report id to 0
		data.copy(sendBuffer, 1);
		sendBuffer.fill(0xFF, data.length+1);

		// Send this report down to the HID device
		// node-hid seems to dislike buffers and send out garbage instead,
		// so we give it a flat array
		let sendData = [ ];
		sendBuffer.forEach((x) => sendData.push(x));

		this.device.write(sendData);
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
			this.once('data', (data) => resolve(data));
			//this.once('error', (e) => reject(e));
		});

		this.write(data);

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

			return [ data.readFloatLE(3), data.readFloatLE(7) ]
		});
	}
}

module.exports = Device;
