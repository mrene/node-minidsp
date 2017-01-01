# node-minidsp
This provides a command line interface to control the MiniDSP2x4HD directly over USB HID. It was developped using the plugin version 107 (September 2016) and contains minimal functionality to operate the device under Linux.

DISCLAIMER: The stock miniDSP plugin relies on last-change timestamps to synchronize its state. Changing some properties through this tool may reset that timestamp and force the configuration to be reloaded the next time the official application connects to the device. Backup your configuration first.

![demo](./demo.gif)

## Installation
```
npm install -g minidsp
```

In order to run as a non-privileged user under Linux, you may have to add a udev rule for this specific device. Under `/etc/udev/rules.d`, create a file named `99-minidsp.rules` containing:

```
# MiniDSP 2x4HD
ATTR{idVendor}=="2752", ATTR{idProduct}=="0011", MODE="660", GROUP="plugdev"
```

Then reload using:

```
sudo udevadm control --reload-rules
```


## Usage
```
$ minidsp  --help

  Usage: minidsp [options] [command]


  Commands:

    devices            List available devices
    input <source>     Set input source [analog|toslink|usb]
    config <index>     Set active configuration [0-3]
    mute [enable]      Sets the global mute flag
    gain <gain>        Set the master gain level (acceptable range -127 dB to 0 dB)
    input-gain <gain>  Sets the input gain level (-127 dB to 12 dB)
    monitor            Monitor input levels
    proxy              Runs a proxy on port 5333 intended for use with the mobile application

  Options:

    -h, --help                  output usage information
    -V, --version               output the version number
    -t --transport <transport>  Set the underlying transport type (usb, net)
    -o --opt <opt>              Set transport-specific parameters
```


### Proxy mode
The plugin application itself uses a helper application communicating via TCP to localhost:5333. This also is the protocol used by the mobile application to provide its remote control interface. Running the application as a proxy will open that port and relay messages to/from the USB interface.

The plugin's Mac version will first attempt a connection before launching the helper application. You can forward it to another machine via `socat` like this: `socat TCP-LISTEN:5333 TCP:192.168.1.144:5333` 

### Transport
This tool can either talk to the device via USB, or to the proxy running somewhere else.

To control a remote device from the command line, use the following syntax:
```
minidsp -t net -o "host=ip-here" [command]
```

### Working with multiple devices
You can list the available device paths using `minidsp devices` - then use `-o path=[path-here]` to select which device to use.


### Examples

* Set gain to -20dB: `minidsp gain -- -20`
* Switch active input to USB: `minidsp input usb`
* Monitor: `minidsp monitor`


