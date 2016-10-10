#!/usr/bin/env node

let Device = require('./src/device');
let program = require('commander');

program.version('0.1');

let actions = [ ];

program
	.command('input <source>')
	.description('Set input source [analog|toslink|usb]')
	.action((source) => {
		actions.push(dsp.setInput(source));
	});

program
	.command('mute [enable]')
	.description('Sets the global mute flag')
	.action((enable) => {
		let value = enable || 'on';
		actions.push(dsp.setMute(value === 'on'));
	});

program
	.command('gain <gain>')
	.description('Set the master gain level (acceptable range -127 dB to 0 dB)')
	.action((gain) => {
		actions.push(dsp.setVolume(+gain));
	});

program
	.command('input-gain <gain>')
	.description('Sets the input gain level (-127 dB to 12 dB)')
	.action((gain) => {
		actions.push([ 1, 2 ]
			.map((x) => dsp.getInput(x))
			.reduce((prevVal,curVal) => 
				prevVal.then(() => curVal.setGain(gain)), Promise.resolve()
			));
	});

program
	.command('monitor')
	.description('Monitor input levels')
	.action(() => {
		const inputChannels = [0, 1];
		const ProgressBar = require('ascii-progress');

		var bars = inputChannels.map((x) => new ProgressBar({
				  schema:` ${x+1} [:bar] :token`,
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
	});

let dsp = new Device();
program.parse(process.argv);

if (actions.length) {
	Promise.all(actions)
	// Close the device so we can exit 
	.then(dsp.close.bind(dsp))
	.catch((e) => {
		console.error(e.toString());
		process.exit(1);
	});
}
