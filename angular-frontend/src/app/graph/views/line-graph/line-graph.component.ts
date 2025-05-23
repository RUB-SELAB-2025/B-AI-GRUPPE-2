import { Component, computed, effect, ElementRef, inject, signal, viewChild, WritableSignal } from '@angular/core';
import * as d3 from 'd3';
import { ResizeObserverDirective } from '../../../shared/resize-observer.directive';
import { Channel, DataServer, SessionData } from '../../../omnai-datasource/data-server';
import { DummyDataService } from '../../../omnai-datasource/dummy-data-server/dummy-data.service';

/** How many datapoints the graph data should be reduced to */
const DISPLAY_PRECISION = 200
/** How close should two scales have to be to be set equal */
const ROUNDING_ERROR_FRACTION = 1000
/** How slowly should the scale adjust */
const VIEW_SCALING_SLOWDOWN = 200
/** How much padding should the scale have, in percent */
const VIEW_SCALE_PADDING = 10

const VIEW_SCALING_FRACTION = 1 - 1 / VIEW_SCALING_SLOWDOWN

type Stream = {
  start: number
  values: number[]
}

type ChannelData = {
  channel: Channel
  streams: Stream[]
}

type Data = ChannelData[]

/**
 * Metadata of a single channel.
 *
 * Stores and processes color and scale.
 */
class ChannelView {
  public readonly $hue = signal(0)
  public readonly $color = computed(() => `hsl(${this.$hue()}, 100%, 50%)`)

  public readonly targetScale: { min: number, max: number } = { min: 0, max: 0 }
  public readonly viewedScale: { min: number, max: number } = { min: 0, max: 0 }

  constructor(hue: number) {
    this.$hue.set(hue)
  }

  /**
   * Smoothly move the viewed scale closer to the target scale.
   *
   * @param delta the time passed since the last update
   */
  public updateViewScale(delta: number) {
    if (this.viewedScale.min === this.viewedScale.max) {
      this.viewedScale.min = this.targetScale.min
      this.viewedScale.max = this.targetScale.max
      return
    }

    const roundingError = (this.viewedScale.max - this.viewedScale.min) / ROUNDING_ERROR_FRACTION

    if (this.viewedScale.min !== this.targetScale.min) {
      this.viewedScale.min = this.viewedScale.min * Math.pow(VIEW_SCALING_FRACTION, delta) + this.targetScale.min * (1 - Math.pow(VIEW_SCALING_FRACTION, delta));
      if (Math.abs(this.targetScale.min - this.viewedScale.min) < roundingError)
        this.viewedScale.min = this.targetScale.min
    }
    if (this.viewedScale.max !== this.targetScale.max) {
      this.viewedScale.max = this.viewedScale.max * Math.pow(VIEW_SCALING_FRACTION, delta) + this.targetScale.max * (1 - Math.pow(VIEW_SCALING_FRACTION, delta));
      if (Math.abs(this.targetScale.max - this.viewedScale.max) < roundingError)
        this.viewedScale.max = this.targetScale.max
    }
  }
}

@Component({
  selector: 'app-line-graph',
  imports: [ResizeObserverDirective],
  standalone: true,
  providers: [DummyDataService],
  templateUrl: './line-graph.component.html',
  styleUrl: './line-graph.component.css'
})
export class LineGraphComponent {
  readonly xAxis = viewChild.required<ElementRef<SVGGElement>>('xAxis');

  private readonly dataSource: DataServer = inject(DummyDataService);

  private readonly $svgWidth = signal(300)
  private readonly $svgHeight = signal(150)

  private readonly channels: { [id: string]: ChannelView } = {}

  /**
   * The viewed time; effectively the x axis.
   *
   * If end is set to null, the view is live.
   */
  private viewedTime: { amount: number, end: null | number } = { amount: 5000, end: null }

  constructor() {
    const drawLoop = async () => {
      await this.draw()
      requestAnimationFrame(drawLoop)
    }
    drawLoop()
  }

  /**
   * Gets a hue that is as far away from preexisting hues as possible.
   */
  private getNewChannelHue(): number {
    const channels = Object.values(this.channels)

    // for the first channel, pick a random color
    if (channels.length === 0) {
      return Math.floor(Math.random() * 360)
    }

    const hues = channels.map(channel => channel.$hue())
    hues.sort()

    // check the spaces at the outer bounds
    if (hues[0] > (360 - hues[hues.length - 1])) {
      var biggestDiff = hues[0]
      var biggestDiffHue = Math.floor(hues[0] / 2)
    } else {
      var biggestDiff = 360 - hues[hues.length - 1]
      var biggestDiffHue = Math.floor(360 - biggestDiff / 2)
    }

    // check the spaces between the existing hues
    for (let i = 1; i < hues.length; i++) {
      const diff = hues[i] - hues[i - 1]
      if (diff > biggestDiff) {
        biggestDiff = diff
        biggestDiffHue = Math.floor(hues[i - 1] + diff / 2)
      }
    }

    return biggestDiffHue
  }

  /**
   * Updates the recorded dimensions of the svg.
   *
   * Gets called from an HTML callback.
   */
  public updateDimensions(dimensions: { width: number, height: number }) {
    this.$svgWidth.set(dimensions.width)
    this.$svgHeight.set(dimensions.height)
  }

  /**
   * Gets the currently viewed time frame.
   */
  private getViewTime(): { start: number, end: number } {
    const end = (this.viewedTime.end === null || this.viewedTime.end === -1)
      ? Date.now()
      : this.viewedTime.end
    const start = end - this.viewedTime.amount
    return { start, end }
  }

  /**
   * Adjusts the target scales to fit the entirety of the data
   */
  private updateTargetScales(data: Data) {
    for (const channelData of data) {
      let min = Number.POSITIVE_INFINITY
      let max = Number.NEGATIVE_INFINITY
      for (const stream of channelData.streams) {
        for (const value of stream.values) {
          if (value < min) min = value
          if (value > max) max = value
        }
      }
      const padding = (max - min) / VIEW_SCALE_PADDING

      this.channels[channelData.channel.id].targetScale.min = min - padding
      this.channels[channelData.channel.id].targetScale.max = max + padding
    }
  }

  /**
   * Smoothly move the viewed scales closer to the target scales.
   *
   * @param delta the time passed since the last update
   */
  private updateViewedScales(delta: number) {
    for (const channel of Object.values(this.channels)) {
      channel.updateViewScale(delta)
    }
  }

  private drawState: "ready" | "cooldown" | "scheduled" = "ready"

  /**
   * Schedule a redraw.
   *
   * @param delta the time passed since the last draw
   */
  private async draw(delta: number = 1) {
    if (this.drawState !== "ready") {
      this.drawState = "scheduled"
      return
    }

    await this.drawImmediately(delta)

    this.drawState = (this.viewedTime.end === null)
      ? "scheduled"
      : "cooldown"

    requestAnimationFrame(async delta => {
      const scheduled = (this.drawState === "scheduled")
      this.drawState = "ready"
      if (scheduled)
        await this.draw(delta)
    })
  }

  private sampleDelay(channel: Channel): number {
    return 1000 / channel.sampleRate()
  }

  /**
   * The paths to be displayed.
   */
  public $drawn: WritableSignal<{
    color: string,
    path: string,
  }[]> = signal([])

  /**
   * Draws the lines of one channel.
   *
   * @param start start of the viewed time frame
   * @param end end of the viewed time frame
   * @param width svg width
   * @param height svg height
   * @param min smallest value visible by scale
   * @param max largest value visible by scale
   * @param channelData channel to be drawn
   *
   * @returns the color and path
   */
  private drawLine(start: number, end: number, width: number, height: number, min: number, max: number, channelData: ChannelData, precision?: number): {
    color: string,
    path: string,
  } | null {
    const color = this.channels[channelData.channel.id].$color()

    const dots: [number, number][] = []
    for (const stream of channelData.streams) {
      for (let i = 0; i < stream.values.length; i++) {
        const sampleDelay = (precision)
          ? 1000 / precision
          : this.sampleDelay(channelData.channel)
        const x = width / (end - start) * ((stream.start + i * sampleDelay) - start)
        const y = height - height / (max - min) * (stream.values[i] - min)
        dots.push([x, y])
      }
    }

    const path = d3.line<[number, number]>()
      .x(dot => dot[0])
      .y(dot => dot[1])
      .curve(d3.curveLinear)
      (dots);

    if (path) {
      return { color, path }
    } else {
      return null
    }
  }

  /**
   * Draws the lines.
   *
   * @param start start of the viewed time frame
   * @param end end of the viewed time frame
   * @param width svg width
   * @param height svg height
   * @param data data to be drawn
   */
  private drawLines(start: number, end: number, width: number, height: number, data: Data, precision?: number) {

    const drawn: { color: string, path: string }[] = []

    for (const channelData of data) {
      const { max, min } = this.channels[channelData.channel.id].viewedScale

      const path = this.drawLine(start, end, width, height, min, max, channelData, precision)

      if (path) {
        drawn.push(path)
      }
    }

    this.$drawn.set(drawn)
  }

  /**
   * Draws the x axis.
   *
   * @param start start of the viewed time frame
   * @param end end of the viewed time frame
   * @param width svg width
   */
  private drawAxis(start: number, end: number, width: number) {
    const domain = [new Date(start), new Date(end)]

    const scale = d3.scaleUtc()
      .domain(domain)
      .range([0, width])

    const axis = d3.axisBottom(scale)

    const g = this.xAxis().nativeElement

    d3.select(g).call(axis);
  }

  /**
   * Checks whether the data contains any values
   *
   * @param data data to be checked
   * @returns whether the data is empty
   */
  private isDataEmpty(data: Data): boolean {
    for (const channel of data) {
      for (const stream of channel.streams) {
        if (stream.values.length !== 0) {
          return false
        }
      }
    }
    return true
  }

  /**
   * Adds new `ChannelView`s if necessary.
   */
  private addNewChannels(data: Data) {
    for (const channelData of data) {
      if (!(channelData.channel.id in this.channels)) {
        const hue = this.getNewChannelHue()
        this.channels[channelData.channel.id] = new ChannelView(hue)
      }
    }
  }

  private processData(data: SessionData[]): Data {
    const channels: Map<Channel, ChannelData> = new Map()

    for (const session of data) {
      for (const channelData of session.data) {
        if (!channels.has(channelData.channel)) {
          channels.set(channelData.channel, {
            channel: channelData.channel,
            streams: []
          })
        }
        const streams = channels.get(channelData.channel)!.streams
        streams.push({
          start: session.startTime,
          values: channelData.values
        })
      }
    }

    const processed: ChannelData[] = []
    for (const channel of channels.values()) {
      processed.push(channel)
    }

    return processed
  }

  /**
   * Does a redraw.
   *
   * @param delta the time passed since the last draw
   */
  private async drawImmediately(delta: number = 1) {
    const { start, end } = this.getViewTime()

    const width = this.$svgWidth()
    const height = this.$svgHeight()

    const rawData = await this.dataSource.getData({ endTime: end, duration: this.viewedTime.amount, precision: DISPLAY_PRECISION })

    const data = this.processData(rawData)

    if (this.isDataEmpty(data))
      return

    this.addNewChannels(data)

    this.updateTargetScales(data)
    this.updateViewedScales(delta)

    this.drawLines(start, end, width, height, data, DISPLAY_PRECISION)
    this.drawAxis(start, end, width)
  }
}
