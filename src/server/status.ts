import { ChatComponent } from "../chat/mod.ts";

export interface ServerStatus {
  version: {
    name: string;
    protocol: number;
  };
  players: {
    online: number;
    max: number;
  };
  description: ChatComponent;
  favicon?: string;
}
