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

import { effect, Injectable, signal, WritableSignal } from "@angular/core"
import { DataStream, DataStreamService } from "../data-stream-service"

const SAMPLE_RATE = 1000
const DUMMY_CHANNELS = [{
  id: "111",
  offset: 3,
  frequency: 3,
  amplification: 1
}, {
  id: "222",
  offset: 7,
  frequency: 5,
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
              value: channel.offset + Math.sin((SIN_CONST * channel.frequency * time) * channel.amplification)
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
