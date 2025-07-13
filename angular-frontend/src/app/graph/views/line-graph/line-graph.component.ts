import { Component, computed, effect, ElementRef, inject, linkedSignal, Signal, signal, viewChild, WritableSignal, OnInit, OnDestroy } from '@angular/core';
import * as d3 from 'd3';
import { ResizeObserverDirective } from '../../../shared/resize-observer.directive';
import { ZoomControlsComponent } from './zoom-controls/zoom-controls.component'; // Pfad anpassen
import { Channel, DataServer, SessionData } from '../../../omnai-datasource/data-server';
import { DummyDataService } from '../../../omnai-datasource/dummy-data-server/dummy-data.service';
import { ChannelSelectComponent } from "../../channel-vis-selection/channel-select/channel-select.component";
import { GraphStateService } from '../../../graph-state.service';
import { MouseInteractionComponent } from '../../mouse-interaction/mouse-interaction.component';
import { OverviewComponent } from './overview/overview.component';

/** How many datapoints the graph data should be reduced to */
const DISPLAY_PRECISION = 3840
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
  public readonly $color: Signal<string>
  public readonly $hidden: WritableSignal<boolean> = signal(false)

  public readonly targetScale: { min: number, max: number } = { min: 0, max: 0 }
  public readonly viewedScale: { min: number, max: number } = { min: 0, max: 0 }

  constructor(color: Signal<string>) {
    this.$color = color
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

export type ChannelViewData = {
  $color: Signal<string>
  $hidden: WritableSignal<boolean>
}

@Component({
  selector: 'app-line-graph',
  imports: [ResizeObserverDirective, ZoomControlsComponent, ChannelSelectComponent, MouseInteractionComponent, OverviewComponent],
  standalone: true,
  providers: [DummyDataService],
  templateUrl: './line-graph.component.html',
  styleUrl: './line-graph.component.css'
})
export class LineGraphComponent {
  readonly xAxis = viewChild.required<ElementRef<SVGGElement>>('xAxis');

  private readonly dataSource: DataServer = inject(DummyDataService);

  public readonly $svgWidth = signal(300)      //How many pixels
  private readonly $svgHeight = signal(150)

  //public readonly lastViewedData:WritableSignal<SessionData[]> = signal([]);
  //public readonly lastViewedTime = signal({start:0,end:0});

  private readonly $writechannels: WritableSignal<Map<string, ChannelView>> = signal(new Map())

  public readonly $channels: Signal<ChannelViewData[]> = computed(() => {
    const channels = this.$writechannels()
    return [...channels.values()]
  })

  private readonly mouseInteraction = viewChild.required(MouseInteractionComponent);

  private lastMouseEvent : null | MouseEvent = null;
  readonly #lastViewedTime: WritableSignal<{ amount: number, end: null | number } | null> = signal(null)
  public readonly $lastViewedTime: Signal<{ amount: number, end: null | number } | null> = this.#lastViewedTime

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
  private readonly viewedTime: { amount: number, end: null | number } = { amount: 5000, end: null }
  private graphState: GraphStateService;

  constructor(graphState: GraphStateService) {
    this.graphState = graphState;
    const drawLoop = async () => {
      await this.draw()
      requestAnimationFrame(drawLoop)
    }
    drawLoop()
  }

  /**
    * Event listeners
    */

  onResize(dimensions : {width : number, height : number}) {
    this.updateDimensions(dimensions);
    this.mouseInteraction().getHeight(dimensions);
  }

  onMouseMove(event : MouseEvent) {
    this.lastMouseEvent = event;
    this.mouseInteraction().onMouseMove(event);
  }

  onMouseLeave(event: MouseEvent) {
    this.lastMouseEvent = null;
    this.mouseInteraction().onMouseLeave(event);
  }

  onClick(event : MouseEvent) {
    const { start, end } = this.getViewTime();

    const rel_x = event.clientX / this.$svgWidth();

    const t = start + rel_x * this.viewedTime.amount;

    this.mouseInteraction().onClick(t);
  }

  /**
    * Update Bars
  */
  private async updateBars() {
    const { start, end } = this.getViewTime();

    const rawData = await this.dataSource.getData({ endTime: end, duration: this.viewedTime.amount, precision: DISPLAY_PRECISION })

    const data = this.processData(rawData);

    if (this.isDataEmpty(data)) return;

    this.mouseInteraction().updateBars(start, end, this.viewedTime.amount, this.$svgWidth());
  }

  /**
    * Update Text of Bars
  */
  private async updateText() {
    const {start, end } = this.getViewTime();
    const width = this.$svgWidth();
    const height = this.$svgHeight();

    const rawData = await this.dataSource.getData({ endTime: end, duration: this.viewedTime.amount, precision: DISPLAY_PRECISION });

    const data = this.processData(rawData);
    if (this.isDataEmpty(data)) return;
    if (!this.lastMouseEvent) return;

    for (const channelData of data) {
      const channels = this.$writechannels();
      const { max, min } = channels.get(channelData.channel.id)!.viewedScale;
      const color = channels.get(channelData.channel.id)!.$color();
      const closest = this.getClosest(start, end, width, height, min, max, channelData, this.lastMouseEvent.clientX);


      const id : number = +channelData.channel.id;

      this.mouseInteraction().setText(id, closest.y, color);
    }
  }

  /**
    * Returns closest point to pos
  */
  private getClosest( start : number, end : number, width : number, height : number, min : number, max : number, channelData : ChannelData, mouseX : number) {
    const dots = this.getDots(start, end, width, height, min, max, channelData, DISPLAY_PRECISION);
    let closest : {x : number, y : number} = {x : 0, y : 0};
    let smallest = Infinity;

    for (const dot of dots) {
      const dist = Math.abs(dot[0] - mouseX);

      if (dist < smallest) {
        smallest = dist;
        closest = {x : dot[0], y : dot[1]};
      }
    }
    return closest;
  }

  /**
* Returns array of all dots on screen
  */
  private getDots(start : number, end : number, width : number, height : number, min : number, max : number, channelData : ChannelData, precision? : number) {
    const dots: [number, number][] = []
    for (const stream of channelData.streams) {
      for (let i = 0; i < stream.values.length; i++) {
        const sampleDelay = (precision)
          ? 1000 / precision
          : this.sampleDelay(channelData.channel)
        const x = width / (end - start) * ((stream.start + i * sampleDelay) - start)
        const y = height - height / (max - min) * (stream.values[i] - min)
        dots.push([x, stream.values[i]])
}
    }
    return dots;
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

  public readonly setViewTime = (viewTime: { amount?: number, end?: number | null }) => {
    if (viewTime.amount !== undefined)
      this.viewedTime.amount = viewTime.amount
    if (viewTime.end !== undefined)
      this.viewedTime.end = viewTime.end
  }

  /**
    * Pause Graph visually
  */
  public setPause() {
    const btn = document.getElementById("btn_pause") as HTMLElement;
    if (this.viewedTime.end == null) {
      const { start, end } = this.getViewTime();
      this.setViewTime({end : start + this.viewedTime.amount});
      btn.innerHTML = "Weiter";
    } else {
      btn.innerHTML = "Pause";
      this.setViewTime({end : null});
    }
  }

  /**
   * Gets the currently viewed time frame.
   */
public getViewTime(): { start: number, end: number } {
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

      const channels = this.$writechannels()
      channels.get(channelData.channel.id)!.targetScale.min = min - padding
      channels.get(channelData.channel.id)!.targetScale.max = max + padding
    }
  }

  /**
   * Smoothly move the viewed scales closer to the target scales.
   *
   * @param delta the time passed since the last update
   */
  private updateViewedScales(delta: number) {
    for (const channel of this.$writechannels().values()) {
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

    this.updateBars();
    this.updateText();

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
  private drawLine(start: number, end: number, width: number, height: number, min: number, max: number, channelData: ChannelData, timePerValue?: number): {
    color: string,
    path: string,
  } | null {
    const color = channelData.channel.color()

    const dots: [number, number][] = []
    for (const stream of channelData.streams) {
      for (let i = 0; i < stream.values.length; i++) {
        const sampleDelay = (timePerValue)
          ? timePerValue
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
  private drawLines(start: number, end: number, width: number, height: number, data: Data, timePerValue?: number) {

    const drawn: { color: string, path: string }[] = []

    for (const channelData of data) {
      const channel = this.$writechannels().get(channelData.channel.id)!

      if (channel.$hidden())
        continue

      const { max, min } = channel.viewedScale

      const path = this.drawLine(start, end, width, height, min, max, channelData, timePerValue)

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
      if (!(this.$writechannels().has(channelData.channel.id))) {
        this.$writechannels.update(channels => {
          channels.set(channelData.channel.id, new ChannelView(channelData.channel.color))
          return new Map(channels)
        })
        this.mouseInteraction().addNewText(+channelData.channel.id);
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

    this.#lastViewedTime.set({ amount: this.viewedTime.amount, end: this.viewedTime.end })

    const width = this.$svgWidth()
    const height = this.$svgHeight()

    const rawData = await this.dataSource.getData({ endTime: end, duration: this.viewedTime.amount, precision: DISPLAY_PRECISION })
    //this.lastViewedData.set(rawData);                //< ---- 100% Data ----->
    //this.lastViewedTime.set({start , end})           //<start--- 60% ----end->
    this.graphState.lastViewedTime.set({ start, end });
    this.graphState.rawData.set(rawData);

    const duration = rawData.reduce((acc, session) => acc + (session.endTime - session.startTime), 0)

    const data = this.processData(rawData)

    const realPrecison = Math.max(...data.map(chan => chan.streams.map(stream => stream.values.length).reduce((acc, len) => acc + len, 0)))
    const timePerValue = duration / realPrecison

    if (this.isDataEmpty(data))
      return

    this.addNewChannels(data)

    this.updateTargetScales(data)
    this.updateViewedScales(delta)

    this.drawLines(start, end, width, height, data, timePerValue)
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




