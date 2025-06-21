import { Component, inject, Input, Signal, signal, WritableSignal } from '@angular/core';
import { ResizeObserverDirective } from '../../../../shared/resize-observer.directive';
import { DataServer } from '../../../../omnai-datasource/data-server';
import { DummyDataService } from '../../../../omnai-datasource/dummy-data-server/dummy-data.service';
import * as d3 from 'd3';
import { ChannelViewData } from '../line-graph.component';

const PRECISION = 3840

@Component({
  selector: 'app-overview',
  imports: [ResizeObserverDirective],
  providers: [DummyDataService],
  standalone: true,
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css'
})
export class OverviewComponent {
  @Input() lastViewedTime!: Signal<{ amount: number, end: null | number } | null>

  public readonly $window = signal({
    width: 0,
    right: 0
  })

  private readonly dataSource: DataServer = inject(DummyDataService);

  private readonly $svgWidth = signal(300)
  private readonly $svgHeight = signal(150)

  constructor() {
    const drawLoop = async () => {
      await this.draw()
      requestAnimationFrame(drawLoop)
    }
    drawLoop()
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
   * The paths to be displayed.
   */
  public $drawn: WritableSignal<{
    color: string,
    path: string,
  }[]> = signal([])

  private async draw() {
    const data = await this.dataSource.getData({ precision: PRECISION })

    const realPrecision = data.map(sess => Math.max(...sess.data.map(chan => chan.values.length))).reduce((acc, val) => acc + val, 0)

    let min = Math.min(...data.map(session => Math.min(...session.data.map(sd => Math.min(...sd.values)))))
    let max = Math.max(...data.map(session => Math.max(...session.data.map(sd => Math.max(...sd.values)))))
    if (min === Number.POSITIVE_INFINITY)
      return

    let diff = max - min
    max += diff / 10
    min -= diff / 10
    diff = max - min

    const duration = data.reduce((acc, session) => acc + (session.endTime - session.startTime), 0)
    const timePerVal = duration / realPrecision
    const hPixelPerMS = this.$svgWidth() / duration

    const hPixelPerVal = hPixelPerMS * timePerVal
    const vPixelPerVal = this.$svgHeight() / diff

    const drawn: { color: string, path: string }[] = []

    let leftPixelPos = 0
    for (const session of data) {
      const sessionDuration = session.endTime - session.startTime
      for (const channelData of session.data) {
        const color = channelData.channel.color()

        const dots: [number, number][] = channelData.values.map((value, index) => [
          leftPixelPos + hPixelPerVal * index,
          vPixelPerVal * (value - min)
        ])

        const path = d3.line<[number, number]>()
          .x(dot => dot[0])
          .y(dot => dot[1])
          .curve(d3.curveLinear)
          (dots);

        if (path)
          drawn.push({ color, path })
      }
      leftPixelPos += hPixelPerMS * sessionDuration
    }

    this.$drawn.set(drawn)

    // TODO: fix - current implementation does not adjust for sessions
    const MIN_WIDTH = 10
    const lvt = this.lastViewedTime()
    if (lvt !== null) {
      const now = Date.now()
      const end = (lvt.end === null || lvt.end <= 0)
        ? now
        : lvt.end
      this.$window.set({
        right: (now - end) * hPixelPerMS,
        width: Math.max(MIN_WIDTH, lvt.amount * hPixelPerMS)
      })
    }
  }
}
