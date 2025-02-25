import type { Log } from "@/types/logTypes";

export class WebSocketService {
  public ws: WebSocket | null = null;
  public onLogReceived: ((log: Log) => void) | null = null;

  constructor(private baseUrl: string) {}

  connect(action: string) {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    const finalUrl = `${this.baseUrl}`;
    this.ws = new WebSocket(finalUrl);

    this.ws.onopen = () => console.log(`Connected: ${this.baseUrl}`);

    this.ws.onmessage = (event) => {
      try {
        const logEntry = JSON.parse(event.data) as Log;
        this.onLogReceived?.(logEntry);
      } catch (error) {
        console.error("Invalid log entry:", error);
      }
    };

    this.ws.onclose = () => console.log("Connection closed");
  }
}