import type { Log } from "@/types/raftTypes";

export class WebSocketService {
  public ws: WebSocket | null = null;
  public onLogReceived: ((log: Log) => void) | null = null;
  public onOpen: (() => void) | null = null;
  public onClose: (() => void) | null = null;

  constructor(private baseUrl: string) {}

  connect(action: string) {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    const finalUrl = `${this.baseUrl}`;
    this.ws = new WebSocket(finalUrl);

    this.ws.onopen = () => {
      console.log(`Connected: ${this.baseUrl}`);
      if (this.onOpen) {
        this.onOpen();
      }
      
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(action);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const logEntry = JSON.parse(event.data) as Log;
        if (this.onLogReceived) {
          this.onLogReceived(logEntry);
        }
      } catch (error) {
        console.error("Invalid log entry:", error);
      }
    };

    this.ws.onclose = () => {
      console.log("Connection closed");
      if (this.onClose) {
        this.onClose();
      }
    };
    
    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      if (this.ws) {
        this.ws.close();
      }
    };
  }
}