let Device = require('./src/device');
const Constants = require('./src/constants');

let program = require('commander');
program
	.version('0.1')
	.option('-i --input [source]', 'Set input source', /^analog|toslink|usb$/i)
	.option('-g --gain [vol]','Set master gain (acceptable range -127dB to 0dB)', /^\d+/)
	.option('-m --mute')
	.option('-um --unmute')
	.option('--monitor', 'Monitor input/output levels')
	// .option('--proxy', 'Setup a TCP proxy on port 5333')
	.parse(process.argv);

let dsp = new Device();
let actions = [ ];


if (program.input) {
	actions.push(dsp.setInput(program.input));
}

if (program.gain) {
	actions.push(dsp.setVolume(-parseInt(program.gain)));
}

if (program.mute) {
	actions.push(dsp.setMute(true));
}

if (program.unmute) {
	actions.push(dsp.setMute(true));
}

if (program.monitor) {
	var ProgressBar = require('ascii-progress');

	var bars = [ 
		new ProgressBar({
		  schema:' 1 [:bar] :token',
		  total: 127
		}),
		new ProgressBar({
		  schema:' 2 [:bar] :token',
		  total: 127
		})
	];

	setInterval(() => {
		dsp.getInputLevels().then((levels) => {
			let convertLevel = (x) => 1 - (x/-127);

			bars[0].update(convertLevel(levels[0]), {
				token: levels[0].toFixed(1) + ' dBFS'
			});

			bars[1].update(convertLevel(levels[1]), {
				token: levels[1].toFixed(1) + ' dBFS'
			});
		});
	}, 1000/24)
}

// if (program.proxy) {
// 	actions.push(new Promise(() => {
// 		let net = require('net');
// 		const server = net.createServer((client) => {
// 			client.on();
// 		});

// 		server.listen(5333);
// 	}));
// }

if (actions.length) {
	Promise.all(actions).then(process.exit).catch((err) => {
		console.error(e.toString());
		process.exit(1);
	});
}