/*
MIT License

Copyright (c) 2025 AI-Gruppe

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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

export type SessionOptions = { startTime?: number, endTime?: number } | { startTime: number, duration: number } | { endTime: number, duration: number }
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
