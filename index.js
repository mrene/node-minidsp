let Device = require('./src/device');
let dsp = new Device();

dsp.getVolume().then((vol) => {
	console.log('Master Volume: ', vol);
});
