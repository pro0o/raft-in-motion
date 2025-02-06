import { LogEntry } from '@/types/logs';

interface WebSocketOptions {
    requestRate: number;
}

export class WebSocketService {
    public ws: WebSocket | null = null;
    public onLogReceived: ((log: LogEntry) => void) | null = null;

    constructor(private baseUrl: string, private options: WebSocketOptions) {}

    connect(action: string) {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        const finalUrl = `${this.baseUrl}/${action}?rate=${this.options.requestRate}`;

        this.ws = new WebSocket(finalUrl);

        this.ws.onopen = () => console.log(`Connected: ${action}`);

        this.ws.onmessage = (event) => {
            try {
                const logLines = event.data.split('\n');
                for (const line of logLines) {
                    const match = line.match(/\{.*\}/);
                    if (match) {
                        const logEntry = JSON.parse(match[0]) as LogEntry;
                        this.onLogReceived?.(logEntry);
                    }
                }
            } catch (error) {
                console.error("Invalid log entry:", error);
            }
        };

        this.ws.onclose = () => console.log("Connection closed");
    }
}