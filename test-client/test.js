const WebSocket = require('ws');

const action = process.argv[2] || 'put';
const ws = new WebSocket(`ws://localhost:8081/ws/${action}?rate=3`);

const messageQueue = [];

setInterval(() => {
    if (messageQueue.length > 0) {
        const message = messageQueue.shift();
        try {
            const parsedMessage = JSON.parse(message);
            console.log('\nEvent:', parsedMessage.event);
            console.log(JSON.stringify(parsedMessage, null, 2));
        } catch {
            console.log('Received:', message.toString());
        }
    }
}, 500); 

ws.on('open', () => {
    console.log(`Connected to WebSocket server via /ws/${action}`);
    setTimeout(() => {
        ws.terminate();
        console.log('WebSocket connection forcefully terminated after 30 seconds');
    }, 30000);
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
