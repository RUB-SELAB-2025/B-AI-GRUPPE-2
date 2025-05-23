import { Signal, WritableSignal } from "@angular/core"

export interface Channel {
  readonly id: string

  readonly color: WritableSignal<string>
  readonly alive: Signal<boolean>
  readonly sampleRate: Signal<number>
}

/** A session of data retrieval. */
export type SessionData = {
  /** When the session started. */
  startTime: number
  /** When the session ended. */
  endTime: number
  /** Data retrieved during the session. */
  data: ChannelData[]
}

export type ChannelData = {
  channel: Channel
  values: number[]
}

export type SessionOptions = { startTime: number, endTime: number } | { startTime: number, duration: number } | { endTime: number, duration: number }
export type DataOptions = SessionOptions & { precision?: number }

export interface DataServer {
  readonly channels: Signal<Channel[]>
  readonly aliveChannels: Signal<Channel[]>
  readonly paused: Signal<boolean>

  getData(options?: DataOptions): Promise<SessionData[]>

  getSessions(options?: SessionOptions): Promise<{ startTime: number, endTime: number }[]>

  /** Pause data retrieval. */
  pause(): Promise<void>

  /** Continue data retrieval. */
  play(): Promise<void>
}
