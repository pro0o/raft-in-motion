const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8081/ws?simulate=6');

const messageQueue = [];

setInterval(() => {
    if (messageQueue.length > 0) {
        const message = messageQueue.shift();
        try {
            const parsedMessage = JSON.parse(message);
            console.log(JSON.stringify(parsedMessage, null, 2));
        } catch (err) {
            console.log('Received non-JSON message:', message.toString());
            console.error('Error parsing message:', err);
        }
    }
}, 500);

ws.on('open', () => {
    console.log('Connected to WebSocket server via /ws/');
    setTimeout(() => {
        console.log('Forcefully terminating WebSocket connection after 30 seconds...');
        ws.terminate();
    }, 50000);
});

ws.on('message', (message) => {
    messageQueue.push(message);
});

ws.on('error', (error) => {
    console.error('WebSocket error:', error);
});

ws.on('close', (code, reason) => {
    console.log(`WebSocket connection closed. Code: ${code}, Reason: ${reason}`);
});
