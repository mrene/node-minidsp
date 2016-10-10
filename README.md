# node-minidsp
This provides a command line interface to control the MiniDSP2x4HD directly over USB HID. It was developped using the plugin version 107 (September 2016) and contains minimal functionality to operate the device under Linux.

DISCLAIMER: The stock miniDSP plugin relies on last-change timestamps to synchronize its state. Changing some properties through this tool may reset that timestamp and force the configuration to be reloaded the next time the official application connects to the device. Backup your configuration first.

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

    input <source>     Set input source [analog|toslink|usb]
    mute [enable]      Sets the global mute flag
    gain <gain>        Set the master gain level (acceptable range -127 dB to 0 dB)
    input-gain <gain>  Sets the input gain level (-127 dB to 12 dB)
    monitor            Monitor input levels

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
```


### Examples

* Set gain to -20dB: `minidsp gain -- -20`
* Switch active input to USB: `minidsp input usb`
* Monitor: `minidsp monitor`

