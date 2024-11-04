const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8080/ws');

ws.on('open', () => {
    console.log('Connected to WebSocket server');

    // Forcefully terminate the connection after 2 seconds
    setTimeout(() => {
        ws.terminate(); // Immediately close the connection
        console.log('WebSocket connection forcefully terminated after 10 second');
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
    const timestamp = new Date(logEntry.timestamp / 1000000); // Convert nanoseconds to milliseconds
    const formattedTimestamp = timestamp.toISOString().replace('T', ' ').substr(0, 23);
    
    console.log(`[${formattedTimestamp}] ${getLogStateName(logEntry.state)} (ID: ${logEntry.id})`);
    console.log(`  Args: ${JSON.stringify(logEntry.args, null, 2)}`);
    console.log('---');
}

function getLogStateName(state) {
    switch (state) {
        case 0: return "KV";
        case 1: return "Raft";
        case 2: return "Client";
        default: return "Unknown";
    }
}
