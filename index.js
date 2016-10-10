let Device = require('./src/device');
let program = require('commander');

program
	.version('0.1')
	.option('-i --input <source>', 'Set input source', /^analog|toslink|usb$/i)
	.option('-j --inputgain [gain]', 'Sets input gain')
	.option('-g --gain [vol]','Set master gain (acceptable range -127dB to 0dB)')
	.option('-m --mute', 'Set master mute')
	.option('--unmute', 'Unset master mute')
	.option('--monitor', 'Monitor input levels')
	.parse(process.argv);

let dsp = new Device();
let actions = [ ];

if (program.input) {
	actions.push(dsp.setInput(program.input));
}

if (program.gain) {
	let gain = program.args.length ? program.args[0] : program.gain;
	actions.push(dsp.setVolume(parseInt(gain)));
}

if (program.mute) {
	actions.push(dsp.setMute(true));
}

if (program.unmute) {
	actions.push(dsp.setMute(false));
}

if (program.inputgain) {
	let gain = program.args.length ? program.args[0] : program.inputgain;
	actions.push([ 1, 2 ]
		.map((x) => dsp.getInput(x))
		.reduce((prevVal,curVal) => 
			prevVal.then(() => curVal.setGain(gain)), Promise.resolve()
		));
}

if (program.monitor) {
	const inputChannels = [0, 1];
	const ProgressBar = require('ascii-progress');

	var bars = inputChannels.map((x) => new ProgressBar({
			  schema:` ${x} [:bar] :token`,
		  total: 127
		})
	);

	setInterval(() => {
		dsp.getInputLevels().then((levels) => {
			let convertLevel = (x) => 1 - (x/-127);
			inputChannels.forEach((i) => {
				bars[i].update(convertLevel(levels[i]), {
					token: levels[i].toFixed(1) + ' dBFS'
				});
			});
		});
	}, 1000/24);
}

if (actions.length) {
	Promise.all(actions)
	// Close the device so we can exit 
	.then(dsp.close.bind(dsp))
	.catch((e) => {
		console.error(e.toString());
		process.exit(1);
	});
}
