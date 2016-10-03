let Device = require('./src/device');

let dsp = new Device();

dsp.getVolume().then((vol) => {
	// res.send(vol);
	console.log('Master Volume: ', vol);
	process.exit(0);
});
