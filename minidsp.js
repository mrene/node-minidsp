#!/usr/bin/env node

const Device = require('./src/device');
const program = require('commander');
const debug = require('debug')('minidsp');
const USBTransport = require('./src/transport/usb');
const NetTransport = require('./src/transport/net');

program.version('1.0.3')
	   .option('-t --transport <transport>', 'Set the underlying transport type (usb, net)', 'usb', /^usb|net$/)
	   .option('-o --opt <opt>', 'Set transport-specific parameters');

let actions = [ ];

let _device;

function parseParams(params) {
	if (!params) {
		return {};
	}
	let parts = params.split(',');
	let obj = {};
	parts.forEach((part) => {
		let keyvalue = part.split('=');
		if (keyvalue.length === 2) {
			let key = keyvalue[0],
				value = keyvalue[1];
			obj[key.trim()] = value.trim();
		}
	});

	return obj;
}

function transportClass(name) {
	const transportMap = {
		'usb': USBTransport,
		'net': NetTransport,
	};

	if (!(name in transportMap)) {
		throw new Error(`No such transport ${name}`);
	}

	return transportMap[name];
}

function device() {
	if (_device) {
		return _device;
	}

	debug('Instanciating transport: ', program.transport);
	debug('Params:', program.opt);

	let TransportClass = transportClass(program.transport);
	return _device = new Device({ transport: new TransportClass(parseParams(program.opt)) });
}

program
	.command('devices')
	.description('List available devices')
	.action(() => {
		let TransportClass = transportClass(program.transport);
		let devices = TransportClass.probe(parseParams(program.opt));
		devices.forEach(({path, product}) => console.log(`${path}\t${product}`));
	});

program
	.command('input <source>')
	.description('Set input source [analog|toslink|usb]')
	.action((source) => {
		let dsp = device();
		actions.push(dsp.setSource(source));
	});

program
	.command('config <index>')
	.description('Set active configuration [0-3]')
	.action((index) => {
		let dsp = device();
		actions.push(dsp.setConfig(index));
	});


program
	.command('mute [enable]')
	.description('Sets the global mute flag')
	.action((enable) => {
		let dsp = device();
		let value = enable || 'on';
		actions.push(dsp.setMute(value === 'on'));
	});

program
	.command('gain <gain>')
	.description('Set the master gain level (acceptable range -127 dB to 0 dB)')
	.action((gain) => {
		let dsp = device();
		actions.push(dsp.setVolume(+gain));
	});

program
	.command('input-gain <gain>')
	.description('Sets the input gain level (-127 dB to 12 dB)')
	.action((gain) => {
		let dsp = device();
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
		let dsp = device();
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

program
	.command('proxy')
	.description('Runs a proxy on port 5333 intended for use with the mobile application')
	.action(() => {
		let dsp = device();
		const createProxy = require('./src/proxy');
		createProxy({
			transport: dsp.transport
		});
	});

program.parse(process.argv);

if (actions.length) {
	Promise.all(actions)
	// Close the device so we can exit
	.then(() => _device.close())
	.catch((e) => {
		console.error(e.toString());
		process.exit(1);
	});
}
