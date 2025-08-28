import {
  computed,
  effect,
  inject,
  Injectable,
  Signal,
  signal,
  WritableSignal,
} from "@angular/core";
import { DataStream, DataStreamService } from "../data-stream-service";
import { HttpClient } from "@angular/common/http";

interface SocketMessage {
  devices: string[];
  data: { timestamp: number; value: number[] }[];
}

export interface DataPoint {
  time: number;
  data: {
    channelID: string;
    value: number;
  }[];
}

const CHANNELS_SYNC_DELAY = 1000;
class Socket {
  private readonly address: string;

  private readonly sampleDelay: number;

  private socket: WebSocket | null = null;
  private currentID = 0;
  private counterID = 0;

  readonly #channels: WritableSignal<ChannelMetadata[]> = signal([]);
  public channels: Signal<ChannelMetadata[]> = computed(() => {
    return structuredClone(this.#channels());
  });

  constructor(address: string, sampleRate: number) {
    this.address = address;
    this.sampleDelay = 1000 / sampleRate;
    this.syncChannels();
  }

  private waitingForData: ((value: DataPoint[]) => void)[] = [];
  public getData(): Promise<DataPoint[]> {
    return new Promise((res) => {
      this.waitingForData.push(res);
    });
  }

  private async syncChannels() {
    while (true) {
      try {
        const channels = await this.getChannels();

        let different = channels.length !== this.#channels().length;
        if (!different) {
          outer: for (const newChannel of channels) {
            for (const oldChannel of this.#channels()) {
              if (
                oldChannel.id === newChannel.id &&
                oldChannel.color === newChannel.color
              ) {
                continue outer;
              }
            }
            different = true;
            break;
          }
        }

        if (different) {
          this.#channels.set(channels);
          if (this.socket !== null) this.start();
        }
      } catch (e) {
        console.error("getting channels failed:", e);
      }

      await sleep(CHANNELS_SYNC_DELAY);
    }
  }

  public async start() {
    const id = this.counterID + 1;
    this.counterID = id;
    this.currentID = id;
    this.stop();

    const socketURL = `ws://${this.address}/ws`;
    this.socket = new WebSocket(socketURL);

    this.socket.addEventListener("open", () => {
      if (this.currentID === id) {
        const deviceUuids = this.#channels()
          .map((device) => device.id)
          .join(" ");
        this.socket?.send(JSON.stringify(deviceUuids));
      }
    });

    let ignoreCounter = 0;
    this.socket.addEventListener("message", (event) => {
      // ignore first few messages
      if (ignoreCounter < 2) {
        ignoreCounter++;
        return;
      }

      const msg = this.extractMessage(event.data);

      if (!this.isValidMessage(msg)) return;

      const len = Math.min(msg.devices.length, msg.data.length);
      if (len === 0) return;

      const data: Map<number, { channelID: string; value: number }[]> =
        new Map();
      for (let i = 0; i < len; i++) {
        const channelID = msg.devices[i];
        const startTime = msg.data[i].timestamp;
        for (let j = 0; j < msg.data[i].value.length; j++) {
          const time = startTime + this.sampleDelay * j;
          let arr = data.get(time);
          if (arr === undefined) {
            arr = [];
            data.set(time, arr);
          }
          arr.push({ channelID, value: msg.data[i].value[j] });
        }
      }

      const output: DataPoint[] = [];
      for (const entry of data.entries()) {
        output.push({
          time: entry[0],
          data: entry[1],
        });
      }

      output.sort((a, b) => a.time - b.time);

      const wfd = this.waitingForData;
      this.waitingForData = [];
      for (const res of wfd) {
        res(structuredClone(output));
      }
    });

    this.socket.addEventListener("close", () => {
      if (this.currentID === id) {
        this.currentID = -1;
        this.socket = null;
      }
    });

    this.socket.addEventListener("error", (error) => {
      if (this.currentID === id) {
        console.error("socket error:", error);
        this.currentID = -1;
        this.socket = null;
      }
    });
  }

  private extractMessage(msg: unknown): unknown {
    if (typeof msg === "string") {
      try {
        return JSON.parse(msg);
      } catch {
        return null;
      }
    }
    return msg;
  }

  private isValidMessage(msg: unknown): msg is SocketMessage {
    if (typeof msg !== "object" || msg === null) return false;

    if (!("devices" in msg) || !("data" in msg)) return false;
    if (
      !Array.isArray(msg.devices) ||
      !msg.devices.every((d: unknown) => typeof d === "string")
    ) {
      return false;
    }

    if (
      !Array.isArray(msg.data) ||
      !msg.data.every(
        (entry: unknown) =>
          typeof entry === "object" &&
          entry !== null &&
          "timestamp" in entry &&
          "value" in entry &&
          typeof entry.timestamp === "number" &&
          Array.isArray(entry.value) &&
          entry.value.every((v: unknown) => typeof v === "number"),
      )
    ) {
      return false;
    }

    return true;
  }

  public stop() {
    const socket = this.socket;
    if (socket !== null) {
      this.currentID = -1;
      this.socket = null;
      socket.close();
    }
  }

  readonly #httpClient = inject(HttpClient);
  private getChannels(): Promise<ChannelMetadata[]> {
    return new Promise(async (res, rej) => {
      const url = `http://${this.address}/UUID`;
      let subscription = this.#httpClient.get<DeviceOverview>(url).subscribe({
        next: (response) => {
          if (response.devices && response.colors) {
            const channels: ChannelMetadata[] = [];
            for (let i = 0; i < response.devices.length; i++) {
              const rawColor = response.colors[i]?.color;
              const color = rawColor
                ? `rgb(${rawColor.r}, ${rawColor.g}, ${rawColor.b})`
                : "rgb(0,0,0)";
              channels.push({ id: response.devices[i].UUID, color });
            }
            res(channels);
          }
          subscription.unsubscribe();
        },
        error: () => {
          subscription.unsubscribe();
          rej();
        },
      });
    });
  }
}

interface DeviceOverview {
  devices: {
    UUID: string;
  }[];
  colors: {
    color: { r: number; g: number; b: number };
  }[];
}

export interface ChannelMetadata {
  id: string;
  color: string;
}

class OmnaiDataStream implements DataStream {
  public readonly sampleRate: number = 100000;
  public readonly paused: WritableSignal<boolean> = signal(false);

  private socket: Socket | null = null;

  private waitingForInit: (() => void)[] | null = [];
  private waitForInit(): Promise<void> {
    return new Promise((res) => {
      if (this.waitingForInit === null) res();
      else this.waitingForInit.push(res);
    });
  }

  private readonly port: WritableSignal<number> = signal(8080);
  private readonly backendAddress: Signal<string> = computed(
    () => `127.0.0.1:${this.port()}`,
  );

  readonly #channels: WritableSignal<{ id: string; color: string }[]> = signal(
    [],
  );
  public readonly channels: Signal<ChannelMetadata[]> = computed(() => {
    return structuredClone(this.#channels());
  });

  constructor() {
    this.init();
  }

  public async *subscribe(): AsyncIterable<DataPoint> {
    await this.waitForInit();
    while (true) {
      const points = await this.socket!.getData();
      for (const point of points) {
        yield point;
      }
    }
  }

  private async init(): Promise<void> {
    // get port
    {
      const port = await window.electronAPI?.getOmnAIScopeBackendPort();
      if (port) this.port.set(port);
    }

    this.socket = new Socket(this.backendAddress(), this.sampleRate);

    // start polling
    {
      if (!this.paused()) this.socket.start();
      effect(() => {
        if (this.paused()) this.socket?.stop();
        else this.socket?.start();
      });
    }

    // resolve waiting for init
    {
      const waiting = this.waitingForInit;
      if (waiting !== null) {
        this.waitingForInit = null;
        for (const res of waiting) {
          res();
        }
      }
    }
  }
}

@Injectable({
  providedIn: "root",
})
export class OmnaiDataService extends DataStreamService {
  constructor() {
    const dataSource = new OmnaiDataStream();
    super(dataSource);
  }
}

function sleep(time: number): Promise<void> {
  return new Promise((res) => setTimeout(res, time));
}
