export interface LogEntry {
    timestamp: number; // Nanoseconds since epoch
    state: "KV" | "Raft" | "Client" | "Unknown";
    id: string; // Unique identifier
    args: string[] | Record<string, unknown>; // Arguments can be an array or an object
}
export class WebSocketService {
    private ws: WebSocket | null = null;
    private messageQueue: LogEntry[] = []; // Queue for processing log entries
    private intervalId: NodeJS.Timeout | null = null;
    public onLogReceived: ((log: LogEntry) => void) | null = null; // Add the onLogReceived callback

    constructor(private url: string, private intervalMs = 300) {}

    connect(action: string) {
        // Cleanup existing WebSocket and log queue before reconnecting
        if (this.ws || this.messageQueue.length > 0) {
            console.log("Reinitializing WebSocket connection...");
            this.cleanup(); // Close existing WebSocket and clear the interval
            this.resetLogs(); // Clear the message queue
        }

        const url = this.url.endsWith("/") ? `${this.url}${action}` : `${this.url}/${action}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log(`Connected to WebSocket server via /ws/${action}`);

            // Start processing the message queue
            this.intervalId = setInterval(() => {
                if (this.messageQueue.length > 0) {
                    const logEntry = this.messageQueue.shift();
                    if (logEntry) {
                        if (this.onLogReceived) {
                            this.onLogReceived(logEntry); // Notify new log
                        }
                    }
                }
            }, this.intervalMs);
        };

        this.ws.onmessage = (event) => {
            try {
                const logEntry: LogEntry = JSON.parse(event.data); // Parse the log entry
                this.messageQueue.push(logEntry);
            } catch (error) {
                console.error("Error parsing message:", error);
            }
        };

        this.ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            this.cleanup();
        };

        this.ws.onclose = (event) => {
            console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
            this.cleanup();
        };
    }

    cleanup() {
        if (this.ws) {
            this.ws.close(); // Ensure WebSocket is closed
            this.ws = null;
        }
        if (this.intervalId) {
            clearInterval(this.intervalId); // Clear the interval timer
            this.intervalId = null;
        }
    }

    resetLogs() {
        console.log("Resetting logs.");
        this.messageQueue = []; // Clear the queue
    }
}
