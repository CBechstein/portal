const MIDI_UUID_SERVICE = "03b80e5a-ede8-4b33-a751-6ce34ec4c700";
const MIDI_UUID_CHARACTERISTIC = "7772e5db-3868-4112-a1a9-f2669d106bf3";


document.getElementById('scan-bluetooth').addEventListener('click', async () => {
    try {
        const options = {
            filters: [
                { services: [MIDI_UUID_SERVICE] },
            ],
        };
        const device = await navigator.bluetooth.requestDevice(options);
        connectToDevice(device);
    } catch (error) {
        console.error('Bluetooth device scanning error:', error);
    }
});

async function connectToDevice(device) {
    try {
        let server = await device.gatt.connect();
        let service = await server.getPrimaryService(MIDI_UUID_SERVICE)
        let charac = await service.getCharacteristic(MIDI_UUID_CHARACTERISTIC)
        await charac.startNotifications()
    } catch (error) {
        console.error('Bluetooth device connection error:', error);
    }
}
