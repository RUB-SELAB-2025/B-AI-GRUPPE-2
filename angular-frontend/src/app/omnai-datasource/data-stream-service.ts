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

import { computed, effect, signal, Signal, WritableSignal } from '@angular/core';
import { Channel, ChannelData, DataOptions, DataServer, SessionData, SessionOptions } from './data-server';

class WritableChannel implements Channel {
  public readonly id: string

  public readonly color: WritableSignal<string>
  public readonly alive: WritableSignal<boolean>
  public readonly sampleRate: Signal<number>

  constructor(id: string, color: string, sampleRate: number) {
    this.id = id
    this.color = signal(color)
    this.alive = signal(true)
    this.sampleRate = signal(sampleRate)
  }
}

export interface DataStream {
  readonly sampleRate: number,

  subscribe(): AsyncIterable<{
    time: number,
    data: {
      channelID: string,
      value: number
    }[]
  }>

  readonly paused: WritableSignal<boolean>
}

type WritableSession = {
  startTime: number,
  endTime: number,
  data: WritableChanData[]
}

type WritableChanData = {
  channel: WritableChannel,
  values: number[]
}

export class DataStreamService implements DataServer {
  readonly #channels: WritableSignal<WritableChannel[]> = signal([])
  public readonly channels: Signal<Channel[]> = this.#channels
  public readonly aliveChannels: Signal<Channel[]> = computed(() => this.channels().filter(channel => channel.alive))

  public readonly paused: Signal<boolean> = computed(() => this.#dataStream.paused())

  readonly #dataStream: DataStream
  readonly #timePerSample: number

  readonly #data: WritableSession[] = []

  private newSession(): WritableSession {
    const now = Date.now()

    if (this.#data.length !== 0 && this.#data[this.#data.length - 1].endTime === -1)
      this.#data[this.#data.length - 1].endTime = now

    const data: WritableChanData[] = []
    for (const channel of this.#channels()) {
      data.push({
        channel,
        values: []
      })
    }

    const session: WritableSession = {
      startTime: now,
      endTime: -1,
      data
    }

    this.#data.push(session)

    return session
  }

  constructor(stream: DataStream) {
    this.#dataStream = stream
    this.#timePerSample = 1000 / this.#dataStream.sampleRate

    let interval: null | number = null;

    effect(() => {
      if (interval !== null) {
        clearInterval(interval)
        interval = null
      }

      if (this.paused()) {
        const session = this.#data[this.#data.length - 1]
        if (session?.endTime === -1)
          session.endTime = Date.now()
      } else {
        let session = this.#data[this.#data.length - 1]
        if (session?.endTime !== -1) {
          const data: {
            channel: WritableChannel,
            values: number[]
          }[] = []
          for (const channel of this.#channels()) {
            data.push({
              channel,
              values: []
            })
          }
          session = {
            startTime: Date.now(),
            endTime: -1,
            data
          }
          this.#data.push(session)
        }
      }
    })

    this.getDataFromStream(stream)
  }

  private async getDataFromStream(stream: DataStream) {
    for await (const entries of stream.subscribe()) {
      if (!this.paused()) {
        let channelCreated = false

        channelCreation: for (const entry of entries.data) {
          for (const channel of this.#channels()) {
            if (channel.id === entry.channelID)
              continue channelCreation
          }
          this.addChannel(entry.channelID)
          channelCreated = true
        }

        const session = (channelCreated)
          ? this.newSession()
          : this.#data[this.#data.length - 1]

        valueAdd: for (const entry of entries.data) {
          for (const channelData of session.data) {
            if (channelData.channel.id === entry.channelID) {
              channelData.values.push(entry.value)
              continue valueAdd
            }
          }
          for (const channel of this.#channels()) {
            if (channel.id === entry.channelID) {
              channel.alive.set(true)
              break
            }
          }
        }
      }
    }
  }

  public async play() {
    if (this.channels().length !== 0) {
      this.#dataStream.paused.set(false)
    }
  }

  public async pause() {
    this.#dataStream.paused.set(true)
  }

  public addChannel(id?: string) {
    id ||= String(this.#channels().length)
    const hue = Math.floor(Math.random() * 360)
    const color = `hsl(${hue}, 100%, 50%)`
    this.#channels.update(channels => {
      channels.push(new WritableChannel(id, color, this.#dataStream.sampleRate))
      return [...channels]
    })
  }

  private cloneSessionData(data: SessionData): SessionData {
    return {
      startTime: data.startTime,
      endTime: data.endTime,
      data: this.cloneChannelData(data.data)
    }
  }

  private cloneChannelData(data: ChannelData[]): ChannelData[] {
    const copy = []
    for (const entry of data) {
      copy.push({
        channel: entry.channel,
        values: [...entry.values]
      })
    }
    return copy
  }

  private increaseStartTime(newStartTime: number, data: SessionData) {
    const startDiff = newStartTime - data.startTime
    if (startDiff > 0) {
      const indexDiff = Math.ceil(startDiff / this.#timePerSample)
      if (indexDiff >= data.data[0].values.length) {
        data.startTime = data.endTime
        for (let i = 0; i < data.data.length; i++) {
          data.data[i].values.splice(0, data.data[i].values.length)
        }
      } else {
        data.startTime = newStartTime
        for (let i = 0; i < data.data.length; i++) {
          data.data[i].values.splice(0, indexDiff)
        }
      }
    }
  }

  private decreaseEndTime(newEndTime: number, data: SessionData) {
    const endDiff = data.endTime - newEndTime
    if (endDiff > 0) {
      const indexDiff = Math.ceil(endDiff / this.#timePerSample)
      if (indexDiff >= data.data[0].values.length) {
        data.endTime = data.startTime
        for (let i = 0; i < data.data.length; i++) {
          data.data[i].values.splice(0, data.data[i].values.length)
        }
      } else {
        data.endTime = newEndTime
        for (let i = 0; i < data.data.length; i++) {
          data.data[i].values.splice(data.data[i].values.length - indexDiff, indexDiff)
        }
      }
    }
  }

  private reducePrecision(data: SessionData[], precision: number) {
    const dataPoints = data.map(session => session.data[0]?.values.length ?? 0).reduce((acc, val) => acc + val, 0)
    const valuePerValues = dataPoints / precision

    for (const session of data) {
      for (const channelData of session.data) {
        const values = []
        for (let i = 0; i < channelData.values.length - 0.5; i += valuePerValues) {
          values.push(channelData.values[Math.round(i)])
        }
        channelData.values = values
      }
    }
  }

  public async getData(options?: DataOptions): Promise<SessionData[]> {
    const sessions = await this.getSessions(options)

    if (sessions.length === 0)
      return []
    else
      return this.getDataRange(sessions[0].startTime, sessions[sessions.length - 1].endTime, options?.precision)
  }

  private async getDataRange(startTime: number, endTime: number, precision: number = 0): Promise<SessionData[]> {
    if (endTime <= startTime)
      return []

    const cutData: SessionData[] = []
    for (const entry of this.#data) {
      cutData.push(this.cloneSessionData(entry))
    }
    if (cutData.length !== 0 && cutData[cutData.length - 1].endTime === -1) {
      cutData[cutData.length - 1].endTime = Date.now()
    }

    let startIndex = -1
    for (let i = 0; i < cutData.length; i++) {
      if (cutData[i].endTime > startTime) {
        startIndex = i
        break
      }
    }
    if (startIndex === -1)
      return []

    let endIndex = -1
    for (let i = cutData.length - 1; i >= startIndex; i--) {
      if (cutData[i].startTime < endTime) {
        endIndex = i
        break
      }
    }
    if (endIndex === -1)
      return []

    const viewedData = cutData.slice(startIndex, endIndex + 1)

    for (let i = viewedData.length - 1; i >= 0; i--) {
      if (viewedData[i].data.length === 0)
        viewedData.splice(i, 1)
    }

    if (viewedData.length === 0)
      return []

    this.increaseStartTime(startTime, viewedData[0])
    if ((viewedData[0].data[0]?.values.length || 0) === 0)
      viewedData.splice(0, 1)
    if (viewedData.length === 0)
      return []

    this.decreaseEndTime(endTime, viewedData[viewedData.length - 1])
    if ((viewedData[viewedData.length - 1].data[0]?.values.length || 0) === 0)
      viewedData.splice(viewedData.length - 1, 1)
    if (viewedData.length === 0)
      return []

    if (precision > 0) {
      this.reducePrecision(viewedData, precision)
    }

    return viewedData
  }

  public async getSessions(options?: SessionOptions): Promise<{ startTime: number; endTime: number; }[]> {
    if (options === undefined)
      return await this.getSessionRange(0, Number.POSITIVE_INFINITY)

    if (!("duration" in options))
      return await this.getSessionRange(options.startTime ?? 0, options.endTime ?? Number.POSITIVE_INFINITY)

    if (options.duration <= 0)
      return []

    if ("startTime" in options) {
      const sessions = await this.getSessionRange(options.startTime, Number.POSITIVE_INFINITY)
      if (sessions.length === 0)
        return []
      let lastIndex = 0
      let time = sessions[0].endTime - options.startTime
      for (let i = 1; i < sessions.length; i++) {
        if (time >= options.duration)
          break
        lastIndex = i
        time += sessions[i].endTime - sessions[i].startTime
      }
      const endTime = sessions[lastIndex].endTime - (time - options.duration)
      return await this.getSessionRange(options.startTime, endTime)
    } else {
      const sessions = await this.getSessionRange(0, options.endTime)
      if (sessions.length === 0)
        return []
      let firstIndex = 0
      let time = options.endTime - sessions[sessions.length - 1].startTime
      for (let i = sessions.length - 2; i >= 0; i--) {
        if (time >= options.duration)
          break
        firstIndex = i
        time += sessions[i].endTime - sessions[i].startTime
      }
      const startTime = sessions[firstIndex].startTime + (time - options.duration)
      return await this.getSessionRange(startTime, options.endTime)
    }
  }

  private async getSessionRange(startTime: number, endTime: number): Promise<{ startTime: number; endTime: number; }[]> {
    if (startTime >= endTime)
      return []

    let startIndex = -1
    for (let i = 0; i < this.#data.length; i++) {
      if (this.#data[i].endTime === -1 || this.#data[i].endTime > startTime) {
        startIndex = i
        break
      }
    }
    if (startIndex === -1)
      return []

    let endIndex = -1
    for (let i = this.#data.length - 1; i >= startIndex; i--) {
      if (this.#data[i].startTime < endTime) {
        endIndex = i
        break
      }
    }
    if (endIndex === -1)
      return []

    const dataSlice = this.#data.slice(startIndex, endIndex + 1)
    if (dataSlice.length === 0)
      return []

    const sessions = dataSlice.map(data => { return { startTime: data.startTime, endTime: data.endTime } })

    if (sessions[0].startTime < startTime)
      sessions[0].startTime = startTime
    if (sessions[sessions.length - 1].endTime === -1 || sessions[sessions.length - 1].endTime > endTime)
      sessions[sessions.length - 1].endTime = endTime

    return sessions
  }
}
