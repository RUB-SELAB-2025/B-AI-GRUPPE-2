// TO BE DELETED - THIS SERVICE WAS QUICKLY MADE FOR TESTING - IT IS BUGGY AND LAGGY

import { computed, Injectable, signal } from '@angular/core';

type Stream = {
  start: number
  values: number[]
}

type Channel = {
  id: number
  streams: Stream[]
}

type Data = Channel[]

@Injectable({
  providedIn: 'root'
})
export class LineDataService {

  public readonly $sampleRate = signal(100)
  public readonly $sampleDelay = computed(() => 1000 / this.$sampleRate())

  private start: number
  private values: number[][]

  constructor() {
    this.values = [[], []]
    this.start = Date.now()
    this.generateData(this.values[0], 100, 100000, 1, 3, 2)
    this.generateData(this.values[1], 100, 100000, 5, 7, 1)
  }

  private generateData(stream: number[], interval: number, rate: number, frequency: number, vOffset: number, amp: number) {
    const countPerIteration = Math.round(rate / interval)
    const timePerEntry = 1000 / rate

    setInterval(() => {
      const start = Date.now() + interval
      for (let i = 0; i < countPerIteration; i++) {
        const t = start + i * timePerEntry
        stream.push(Math.sin(vOffset + (2 * Math.PI * frequency * t) * amp))
      }
    }, interval)
  }

  private reduceData(values: number[], count: number): number[] {
    const result: number[] = []
    for (let i = 0; i < count; i++) {
      result.push(values[Math.floor(values.length * i / count)])
    }
    return result
  }

  public getData(start: number, end: number, precision: number): Data {
    const channels: {id: number, streams: {start: number, values: number[]}[]}[] = []

    for(const v of this.values) {
    if (start < this.start)
      start = this.start

    if (end > this.start + v.length * this.$sampleDelay())
      end = this.start + v.length * this.$sampleDelay()

    const startIndex = Math.ceil((start - this.start) / this.$sampleDelay())
    const endIndex = Math.floor((end - this.start) / this.$sampleDelay())

    let takenValues = v.slice(startIndex, endIndex)

    const reducedValueCount = precision * (end - start) / 1000

    if (reducedValueCount < takenValues.length) {
      takenValues = this.reduceData(takenValues, reducedValueCount)
    }

    channels.push({
      id: channels.length,
      streams: [{
        start: start,
        values: takenValues
      }]
    })
  }

    return channels
  }
}
