import { computed, effect, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { Channel, ChannelData, DataServer, SessionData } from '../data-server';

const NEW_DATA_INTERVAL = 500
const SAMPLE_RATE = 100000

const TIME_PER_SAMPLE = 1000 / SAMPLE_RATE

class DummyChannel implements Channel {
  public readonly id: string

  public readonly color: WritableSignal<string>
  public readonly alive: Signal<boolean>
  public readonly sampleRate: Signal<number>

  public readonly offset: number
  public readonly frequency: number
  public readonly amplification: number

  constructor(id: string, color: string) {
    this.id = id
    this.color = signal(color)
    this.alive = signal(true)
    this.sampleRate = signal(SAMPLE_RATE)

    this.offset = 5 + Math.random() * 10
    this.frequency = 5 + Math.floor(Math.random() * 30)
    this.amplification = 1 + Math.random() * 2
  }
}

@Injectable({
  providedIn: 'root'
})
export class DummyDataService implements DataServer {
  readonly #channels: WritableSignal<DummyChannel[]> = signal([])
  public readonly channels: Signal<Channel[]> = computed(() => [...this.#channels()])
  public readonly aliveChannels: Signal<Channel[]> = computed(() => this.#channels().filter(channel => channel.alive))

  readonly #paused: WritableSignal<boolean> = signal(false)
  public readonly paused: Signal<boolean> = computed(() => this.#paused())

  readonly #data: {
    startTime: number,
    endTime: number,
    data: {
      channel: DummyChannel,
      values: number[]
    }[]
  }[] = []

  constructor() {
    effect(() => {
      const data: {
        channel: DummyChannel,
        values: number[]
      }[] = []
      for (const channel of this.#channels()) {
        data.push({
          channel,
          values: []
        })
      }

      const now = Date.now()
      if (this.#data.length !== 0 && this.#data[this.#data.length - 1].endTime === -1) {
        this.#data[this.#data.length - 1].endTime = now
      }

      this.#data.push({
        startTime: now,
        endTime: -1,
        data
      })
    })

    let interval: null | number = null;

    effect(() => {
      if (interval !== null) {
        clearInterval(interval)
        interval = null
      }

      if (this.paused()) {
        const session = this.#data[this.#data.length - 1]
        if (session.endTime === -1)
          session.endTime = Date.now()
      } else {
        let session = this.#data[this.#data.length - 1]
        if (session.endTime !== -1) {
          const data: {
            channel: DummyChannel,
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

        interval = setInterval(() => {
          const sessionHasDataUntil = session.startTime + session.data[0].values.length * TIME_PER_SAMPLE
          const sessionNeedsDataUntil = Date.now() + NEW_DATA_INTERVAL

          for (const channelData of session.data) {
            for (let coveredTime = sessionHasDataUntil; coveredTime < sessionNeedsDataUntil; coveredTime += TIME_PER_SAMPLE) {
              const value = Math.sin(channelData.channel.offset + (2 * Math.PI * channelData.channel.frequency * coveredTime) * channelData.channel.amplification)
              channelData.values.push(value)
            }
          }
        }, NEW_DATA_INTERVAL) as any;
      }
    })
  }

  public async play() {
    if (this.channels().length !== 0) {
      this.#paused.set(false)
    }
  }

  public async pause() {
    this.#paused.set(true)
  }

  public addChannel() {
    const id = String(this.#channels().length)
    const hue = Math.floor(Math.random() * 360)
    const color = `hsl(${hue}, 100%, 50%)`
    this.#channels.update(channels => {
      channels.push(new DummyChannel(id, color))
      return channels
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
      const indexDiff = Math.ceil(startDiff / TIME_PER_SAMPLE)
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
      const indexDiff = Math.ceil(endDiff / TIME_PER_SAMPLE)
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
    for (const session of data) {
      for (const channelData of session.data) {
        const valuePerValues = channelData.channel.sampleRate() / precision
        if (!Number.isInteger(valuePerValues))
          throw "sample rate must be evenly divisible by precision"
        const values = []
        for (let i = 0; i < channelData.values.length; i += valuePerValues) {
          values.push(channelData.values[i])
        }
        channelData.values = values
      }
    }
  }

  public async getData(startTime: number, endTime: number, precision: number = 0): Promise<SessionData[]> {
    if (endTime <= startTime)
      return []

    let startIndex = -1
    for (let i = 0; i < this.#data.length; i++) {
      if (this.#data[i].endTime > startTime) {
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

    const dataCopy: SessionData[] = []
    for (let i = startIndex; i <= endIndex; i++) {
      dataCopy.push(this.cloneSessionData(this.#data[i]))
    }

    this.increaseStartTime(startTime, dataCopy[0])
    if (dataCopy[0].data[0].values.length === 0)
      dataCopy.splice(0, 1)
    if (dataCopy.length === 0)
      return []

    this.decreaseEndTime(endTime, dataCopy[dataCopy.length - 1])
    if (dataCopy[dataCopy.length - 1].data[0].values.length === 0)
      dataCopy.splice(dataCopy.length - 1, 1)
    if (dataCopy.length === 0)
      return []

    if (precision > 0) {
      this.reducePrecision(dataCopy, precision)
    }

    return dataCopy
  }

  public async getDataWindow(startTime: number, duration: number, precision: number = 0): Promise<SessionData[]> {
    if (duration <= 0)
      return []

    let startIndex = -1
    for (let i = 0; i < this.#data.length; i++) {
      if (this.#data[i].endTime > startTime) {
        startIndex = i
        break
      }
    }
    if (startIndex === -1)
      return []

    const sessions: SessionData[] = [this.cloneSessionData(this.#data[0])]

    let durationCovered = sessions[0].endTime - startTime

    for (let i = 1; i < this.#data.length && durationCovered < duration; i++) {
      sessions.push(this.cloneSessionData(this.#data[i]))
      durationCovered += this.#data[i].endTime - this.#data[i].startTime
    }

    this.increaseStartTime(startTime, sessions[0])
    if (sessions[0].data[0].values.length === 0)
      sessions.splice(0, 1)
    if (sessions.length === 0)
      return []

    const endTime = sessions[sessions.length - 1].endTime - (durationCovered - duration)

    this.decreaseEndTime(endTime, sessions[sessions.length - 1])
    if (sessions[sessions.length - 1].data[0].values.length === 0)
      sessions.splice(0, 1)
    if (sessions.length === 0)
      return []

    if (precision > 0) {
      this.reducePrecision(sessions, precision)
    }

    return sessions
  }

  public async getSessions(startTime: number = 0, endTime: number = Number.POSITIVE_INFINITY): Promise<{ startTime: number; endTime: number; }[]> {
    return this.getData(startTime, endTime)
  }

  public async getSessionWindow(startTime: number = 0, duration: number = Number.POSITIVE_INFINITY): Promise<{ startTime: number; endTime: number; }[]> {
    return this.getDataWindow(startTime, duration)
  }
}
