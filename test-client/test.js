const WebSocket = require('ws');

// Use the second CLI argument, default to "put"
const action = process.argv[2] || 'put';
const ws = new WebSocket(`ws://localhost:8080/ws/${action}`);

ws.on('open', () => {
    console.log(`Connected to WebSocket server via /ws/${action}`);
    // Forcefully terminate the connection after 10 seconds
    setTimeout(() => {
        ws.terminate();
        console.log('WebSocket connection forcefully terminated after 10 seconds');
    }, 10000);
});

ws.on('message', (message) => {
    try {
        const logEntry = JSON.parse(message);
        displayLogEntry(logEntry);
    } catch (error) {
        console.error('Error parsing message:', error);
        console.log('Raw message:', message.toString());
    }
});

ws.on('error', (error) => {
    console.error('WebSocket error:', error);
});

ws.on('close', (code, reason) => {
    console.log(`WebSocket connection closed. Code: ${code}, Reason: ${reason}`);
});

function displayLogEntry(logEntry) {
    const timestamp = new Date(logEntry.timestamp / 1_000_000); // Convert nanoseconds to ms
    const formattedTimestamp = timestamp.toISOString().replace('T', ' ').substring(0, 23);
    const joinedArgs = Array.isArray(logEntry.args) 
        ? logEntry.args.join(' ')
        : JSON.stringify(logEntry.args);

    console.log(
        `[${formattedTimestamp}] ${getLogStateName(logEntry.state)}(ID:${logEntry.id}): ${joinedArgs}`
    );
}

function getLogStateName(state) {
    switch (state) {
        case 'KV':     return 'KV';
        case 'Raft':   return 'Raft';
        case 'Client': return 'Client';
        default:       return 'Unknown';
    }
}
