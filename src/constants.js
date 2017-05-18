const constants = {
	// Use Vendor and Product ID representing the MiniDSP 2x4HD
	USB_VID: 0x2752,
	USB_PID: 0x0011,

	SOURCE_INDEX: {
		'analog': 0,
		'toslink': 1,
		'usb': 2
	},

	SOURCE_NAME: {
		0: 'analog',
		1: 'toslink',
		2: 'usb'
	}
};

module.exports = constants;
