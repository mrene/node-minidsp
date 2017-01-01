let hid = require('node-hid');
let HID = hid.HID;
let Events = require('events');
let debug = require('debug')('minidsp:transport:usb');
const Constants = require('../constants');

class USBTransport extends Events {
    constructor({ vid = Constants.USB_VID, pid = Constants.USB_PID, path } = {}) {
        super();

        if (path) {
            debug('Using usb device path', path);
            this.device = new HID(path);
        } else {
            this.device = new HID(vid, pid);
        }

    	this.device.on('data', this.onData.bind(this));
    }

    static probe({ vid = Constants.USB_VID, pid = Constants.USB_PID } = {}) {
        return hid.devices(vid, pid)
                    .map(({ path, product, serialNumber }) => ({ path, product, serialNumber }));
    }

    close() {
        this.device.close();
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
        data = data.slice(0, length);

        debug('onData', data);

        this.emit('data', data);
    }

    write(data) {
        debug('write', data);

        // Expand data to a 64 byte buffer, pad with 0xFF
        // Since hidapi wants the report id as the first byte, this is
        // one byte longer than the actual data going down the wire
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
}

module.exports = USBTransport;
