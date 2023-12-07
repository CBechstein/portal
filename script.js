const MIDI_UUID_SERVICE = "03b80e5a-ede8-4b33-a751-6ce34ec4c700".toLowerCase();
const MIDI_UUID_CHARACTERISTIC = "7772e5db-3868-4112-a1a9-f2669d106bf3".toLowerCase();
var textEncoder = new TextEncoder();
var bluetoothDevice = null;
var bluetoothServer = null;
var bluetoothMIDIService = null;
var bluetoothMIDICharacteristic = null;


const togglePassword = document.querySelector('#togglePassword');
const passwordField = document.querySelector('#password');
togglePassword.addEventListener('click', function (e) {
    const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordField.setAttribute('type', type);
    this.classList.toggle('fa-eye-slash');
});

document.getElementById('scan-bluetooth').addEventListener('click', async () => {
    try {
        const options = {
            filters: [
                { services: [MIDI_UUID_SERVICE] },
            ],
        };
        let platform = navigator.platform
        if (platform.indexOf('iPhone') !== -1 || platform.indexOf('iPad') !== -1 || platform.indexOf('iPod') !== -1) {
            alert(
                'Unfortunately, your device does not support the usage of Bluetooth in browser. Please consider using \
                an Android device or a notebook.'
            )
            throw('Device does not support Bluetooth in browser.')
        }
        if (!navigator.bluetooth) {
            alert('Unfortunately, your browser does not support Bluetooth. Please consider using Google Chrome.')
            throw('Browser does not support Bluetooth.')
        }
        bluetoothDevice = await navigator.bluetooth.requestDevice(options);
        bluetoothServer = await bluetoothDevice.gatt.connect();
        bluetoothMIDIService = await bluetoothServer.getPrimaryService(MIDI_UUID_SERVICE);
        bluetoothMIDICharacteristic = await bluetoothMIDIService.getCharacteristic(MIDI_UUID_CHARACTERISTIC);
        bluetoothMIDICharacteristic.startNotifications();
    } catch (error) {
        console.error('An error happened while trying to connect to the Bluetooth-MIDI device -->', error);
    }
});

document.getElementById('submit').addEventListener('click', async () => {
    try {
        (async () => {
            if (bluetoothMIDICharacteristic == null) {
                alert('Please make sure to establish a Bluetooth connection before proceeding.')
                throw new Error('A Bluetooth connection must be established first!');
            }
            const fetchPromise = fetch('wrapper.wasm');
            const memory = new WebAssembly.Memory({ initial: 10 });
            const { instance } = await WebAssembly.instantiateStreaming(
                fetchPromise, {
                    env: {
                        __memory_base: new WebAssembly.Global({ value: "i32", mutable: false }, 0),
                        __table_base: new WebAssembly.Global({ value: "i32", mutable: false }, 0),
                        __stack_pointer: new WebAssembly.Global({ value: "i32", mutable: true }, 2048),
                        memory: memory,
                    }
                }
            );
            const ssid = document.getElementById('ssid').value;
            const password = document.getElementById('password').value;
            if (ssid.length < 2 || ssid.length > 32) {
                alert('The entered SSID is either too short or too long.');
                throw('Invalid SSID length');
            }
            if (password.length < 8 || password.length > 63) {
                alert('The entered password is either too short or too long.');
                throw('Invalid password length');
            }
            if (!/^[^!#;+\]\/"\t][^+\]\/"\t]{0,30}[^ +\]\/"\t]$|^[^ !#;+\]\/"\t]$[ \t]+$/.test(ssid)) {
                alert('The entered SSID seems to be invalid!');
                throw('Invalid SSID...');
            }
            const credentials = textEncoder.encode(ssid + password);
            var sharedMemory = new Uint8Array(memory.buffer, 32768);
            sharedMemory.set(credentials);
            let packetSize = instance.exports.encapsulateCredentials(32768, ssid.length, password.length);
            let packet = sharedMemory.slice(0, packetSize);
            for (var i = 0; i < packetSize; i++) {
                if (i % 18 === 0 || i === (packetSize - 1)) {
                    let step = i % 18 === 0 ? 18 : packetSize;
                    await bluetoothMIDICharacteristic.writeValueWithoutResponse(packet.slice(i, i + step));
                }
            }
            console.debug('Successfully sent the SysEx message!');
            alert('Thank you! Your Wi-Fi credential was transmitted successfully and securely to our system.')
          })();
    } catch (error) {
        console.error('An error happened while trying to send out the Wi-Fi credentials -->', error);
    }
});
