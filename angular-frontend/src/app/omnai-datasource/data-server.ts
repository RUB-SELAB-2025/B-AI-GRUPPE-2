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

export interface DataServer {
  readonly channels: Signal<Channel[]>
  readonly aliveChannels: Signal<Channel[]>
  readonly paused: Signal<boolean>

  /**
   * Get the data available between the given start and end time.
   *
   * @param startTime start time of the data
   * @param endTime end time of the data
   * @param precision if specified, reduces the data points per second to the given precision
   */
  getData(startTime: number, endTime: number, precision?: number): SessionData[]

  /**
   * Get the data available within a certain time frame.
   * Pauses within the time frame are skipped.
   *
   * @param startTime start time of the data
   * @param duration amount of time represented by the data
   * @param precision if specified, reduces the data points per second to the given precision
   */
  getDataWindow(startTime: number, duration: number, precision?: number): SessionData[]

  /**
   * Get sessions when data was recorded.
   *
   * @param startTime only retrieve sessions past this time (optional)
   * @param endTime only retrieve sessions before this time (optional)
   *
   * @returns all sessions when data was recorded, ordered by ascending start time
   */
  getSessions(startTime?: number, endTime?: number): { startTime: number, endTime: number }[]

  /**
   * Get sessions when data was recorded.
   *
   * @param startTime only retrieve sessions past this time (optional)
   * @param duration only retrieve as many sessions as necessary to fill the duration (optional)
   *
   * @returns all sessions when data was recorded, ordered by ascending start time
   */
  getSessionWindow(startTime?: number, duration?: number): { startTime: number, endTime: number }[]

  /** Pause data retrieval. */
  pause(): void

  /** Continue data retrieval. */
  play(): void
}
