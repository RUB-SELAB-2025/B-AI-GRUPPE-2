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
  /** All channels that were at some point alive. */
  readonly channels: Signal<Channel[]>
  /** All channels that are currently alive. */
  readonly aliveChannels: Signal<Channel[]>
  /** Whether to pause data retrieval. */
  readonly paused: Signal<boolean>

  /** Get all data within a specified time frame. */
  getData(options?: DataOptions): Promise<SessionData[]>    //getData({duration:10, endTime:32000})

  /** Get all sessions of data retrieval within a specified time frame. */
  getSessions(options?: SessionOptions): Promise<{ startTime: number, endTime: number }[]>

  /** Pause data retrieval. */
  pause(): Promise<void>

  /** Continue data retrieval. */
  play(): Promise<void>
}
