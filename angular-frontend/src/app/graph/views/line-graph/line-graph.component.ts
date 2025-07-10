//import { Component, computed, effect, ElementRef, inject, linkedSignal, signal, viewChild, WritableSignal } from '@angular/core';
import { Component, computed, effect, ElementRef, inject, linkedSignal, signal, viewChild, WritableSignal, OnInit, OnDestroy } from '@angular/core';
import * as d3 from 'd3';
import { LineDataService } from './line-data.service';
import { ResizeObserverDirective } from '../../../shared/resize-observer.directive';
import { ZoomControlsComponent } from './zoom-controls/zoom-controls.component'; // Pfad anpassen

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

type Channel = {
  id: number
  streams: Stream[]
}

type Data = Channel[]

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
  imports: [ResizeObserverDirective, ZoomControlsComponent],
  standalone: true,
  providers: [LineDataService],
  templateUrl: './line-graph.component.html',
  styleUrl: './line-graph.component.css'
})
export class LineGraphComponent {
  readonly xAxis = viewChild.required<ElementRef<SVGGElement>>('xAxis');

  private readonly dataSource = inject(LineDataService);

  private readonly $svgWidth = signal(300)
  private readonly $svgHeight = signal(150)

  private readonly channels: { [id: number]: ChannelView } = {}

  private boundHandleKey = this.handleKey.bind(this);

  public handleKey(event: KeyboardEvent) {
    console.log('LineGraphComponent received key:', event.key);
    switch (event.key) {
      case '+':
      case '=':
        this.onZoomIn();
        break;
      case '-':
        this.onZoomOut();
        break;
      case '0':
        this.onResetZoom();
        break;
      case 'ArrowLeft':
        this.scrollLeft();
        break;
      case 'ArrowRight':
        this.scrollRight();
        break;
      case 'ArrowUp':
        this.scrollReset();
        break;
    }
  }
  /**
   * The viewed time; effectively the x axis.
   *
   * If end is set to null, the view is live.
   */
  private viewedTime: { amount: number, end: null | number } = { amount: 5000, end: null }

  constructor() {
    const drawLoop = () => {
      this.draw()
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
    const end = (typeof this.viewedTime.end === "number")
      ? this.viewedTime.end
      : Date.now()
    const start = end - this.viewedTime.amount
    return { start, end }
  }

  /**
   * Adjusts the target scales to fit the entirety of the data
   */
  private updateTargetScales(data: Data) {
    for (const channel of data) {
      let min = Number.POSITIVE_INFINITY
      let max = Number.NEGATIVE_INFINITY
      for (const stream of channel.streams) {
        for (const value of stream.values) {
          if (value < min) min = value
          if (value > max) max = value
        }
      }
      const padding = (max - min) / VIEW_SCALE_PADDING

      this.channels[channel.id].targetScale.min = min - padding
      this.channels[channel.id].targetScale.max = max + padding
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
  private draw(delta: number = 1) {
    if (this.drawState !== "ready") {
      this.drawState = "scheduled"
      return
    }

    this.drawImmediately(delta)

    this.drawState = (this.viewedTime.end === null)
      ? "scheduled"
      : "cooldown"

    requestAnimationFrame(delta => {
      const scheduled = (this.drawState === "scheduled")
      this.drawState = "ready"
      if (scheduled)
        this.draw(delta)
    })
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
   * @param channel channel to be drawn
   *
   * @returns the color and path
   */
  private drawLine(start: number, end: number, width: number, height: number, min: number, max: number, channel: Channel): {
    color: string,
    path: string,
  } | null {
    const color = this.channels[channel.id].$color()

    const dots: [number, number][] = []
    for (const stream of channel.streams) {
      for (let i = 0; i < stream.values.length; i++) {
        const x = width / (end - start) * ((stream.start + i * this.dataSource.$sampleDelay()) - start)
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
  private drawLines(start: number, end: number, width: number, height: number, data: Data) {

    const drawn: { color: string, path: string }[] = []

    for (const channel of data) {
      const { max, min } = this.channels[channel.id].viewedScale

      const path = this.drawLine(start, end, width, height, min, max, channel)

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
    for (const channel of data) {
      if (!(channel.id in this.channels)) {
        const hue = this.getNewChannelHue()
        this.channels[channel.id] = new ChannelView(hue)
      }
    }
  }

  /**
   * Does a redraw.
   *
   * @param delta the time passed since the last draw
   */
  private drawImmediately(delta: number = 1) {
    const { start, end } = this.getViewTime()
    const width = this.$svgWidth()
    const height = this.$svgHeight()

    const data: Data = this.dataSource.getData(start, end, 100)

    if (this.isDataEmpty(data))
      return

    this.addNewChannels(data)

    this.updateTargetScales(data)
    this.updateViewedScales(delta)

    this.drawLines(start, end, width, height, data)

    this.drawAxis(start, end, width)
  }

  onZoomIn() {
    this.viewedTime.amount *= 0.8;
  }
  
  onZoomOut() {
    this.viewedTime.amount *= 1.25;
  }
  
  onResetZoom() {
    this.viewedTime.amount = 5000;
    this.viewedTime.end = null;
  }

  private scrollStep = 1000; // Scroll um 1 Sekunde

  scrollLeft() {
    console.log("a pressed");
    if (this.viewedTime.end === null) {
      this.viewedTime.end = this.getViewTime().end;
    }
    this.viewedTime.end -= this.scrollStep;
    this.draw();
  }

  scrollRight() {
    if (this.viewedTime.end === null) {
      this.viewedTime.end = this.getViewTime().end;
    }
    this.viewedTime.end += this.scrollStep;
    this.drawImmediately();
  }

  scrollReset() {
    this.viewedTime.end = null;
    this.drawImmediately();
  }
}
