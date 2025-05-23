import { effect, Injectable, signal, WritableSignal } from "@angular/core"
import { DataStream, DataStreamService } from "../data-stream-service"

const SAMPLE_RATE = 100
const DUMMY_CHANNELS = [{
  id: "111",
  offset: 3,
  frequency: 5,
  amplification: 1
}, {
  id: "222",
  offset: 7,
  frequency: 7,
  amplification: 2
}]

const SIN_CONST = 2 * Math.PI / 1000

class DummyDataStream implements DataStream {
  readonly paused: WritableSignal<boolean> = signal(false)
  readonly sampleRate: number
  readonly #timePerSample: number

  #lastPush: number = -1

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate
    this.#timePerSample = 1000 / sampleRate

    effect(() => {
      if (this.paused())
        this.#lastPush = -1
      else
        this.#lastPush = Date.now()
    })
  }

  public async* subscribe(): AsyncIterable<{ time: number, data: { channelID: string, value: number }[] }> {
    const channels: {
      id: string,
      offset: number,
      frequency: number,
      amplification: number
    }[] = DUMMY_CHANNELS

    while (true) {
      const lastPush = this.#lastPush

      if (lastPush !== -1) {
        const now = Date.now()
        const currentPush = now - now % this.#timePerSample
        this.#lastPush = currentPush

        for (let time = lastPush + this.#timePerSample; time <= currentPush; time += this.#timePerSample) {
          const data = []
          for (const channel of channels) {
            data.push({
              channelID: channel.id,
              value: Math.sin(channel.offset + (SIN_CONST * channel.frequency * time) * channel.amplification)
            })
          }
          yield { time, data };
        }
      }
      await new Promise(res => setTimeout(res, this.#timePerSample));
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class DummyDataService extends DataStreamService {
  constructor() {
    super(new DummyDataStream(SAMPLE_RATE))
  }
}
