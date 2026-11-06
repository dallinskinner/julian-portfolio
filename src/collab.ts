import Peer from "peerjs";
import type { DataConnection } from "peerjs";
import type { Doc, Op } from "./canvasDoc";

export type Msg =
  | { t: "snap"; doc: Doc }
  | { t: "op"; op: Op }
  | { t: "cur"; id: string; name: string; color: string; x: number; y: number; page: string; down: boolean; sel: boolean }
  | { t: "bye"; id: string };

export interface SessionEvents {
  onMsg: (msg: Msg) => void;
  onPeerJoin: (id: string) => void; // host only
  onPeerLeave: (id: string) => void;
  onHostLost: () => void; // client only
}

export class Session {
  private peer: Peer;
  private conns = new Map<string, DataConnection>();
  private hostConn: DataConnection | null = null;
  isHost = false;
  id = "";

  private ev: SessionEvents;

  constructor(ev: SessionEvents) {
    this.ev = ev;
    this.peer = new Peer();
  }

  private opened(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.peer.open && this.peer.id) return resolve(this.peer.id);
      this.peer.once("open", (id) => resolve(id));
      this.peer.once("error", (err) => reject(err));
    });
  }

  async host(): Promise<string> {
    this.isHost = true;
    this.id = await this.opened();
    this.peer.on("connection", (conn) => {
      conn.on("open", () => {
        this.conns.set(conn.peer, conn);
        this.ev.onPeerJoin(conn.peer);
      });
      conn.on("data", (data) => {
        const msg = data as Msg;
        this.ev.onMsg(msg);
        this.broadcast(msg, conn.peer); // relay to everyone else
      });
      const gone = () => {
        if (!this.conns.delete(conn.peer)) return;
        this.ev.onPeerLeave(conn.peer);
        this.broadcast({ t: "bye", id: conn.peer });
      };
      conn.on("close", gone);
      conn.on("error", gone);
    });
    return this.id;
  }

  async join(hostId: string): Promise<void> {
    this.id = await this.opened();
    await new Promise<void>((resolve, reject) => {
      const conn = this.peer.connect(hostId, { reliable: true });
      const timer = setTimeout(() => reject(new Error("timed out — is the host still online?")), 12000);
      conn.on("open", () => {
        clearTimeout(timer);
        this.hostConn = conn;
        resolve();
      });
      conn.on("data", (data) => this.ev.onMsg(data as Msg));
      conn.on("close", () => this.ev.onHostLost());
      this.peer.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /** Send to the host (client) or to all peers (host). */
  send(msg: Msg): void {
    if (this.isHost) this.broadcast(msg);
    else if (this.hostConn?.open) this.hostConn.send(msg);
  }

  sendTo(id: string, msg: Msg): void {
    const c = this.conns.get(id);
    if (c?.open) c.send(msg);
  }

  private broadcast(msg: Msg, except?: string): void {
    for (const [id, c] of this.conns) if (id !== except && c.open) c.send(msg);
  }

  peerCount(): number {
    return this.conns.size;
  }

  close(): void {
    this.peer.destroy();
  }
}
