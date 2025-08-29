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

import { Component, ElementRef, inject, Input, Signal, signal, ViewChild, WritableSignal } from '@angular/core';
import { ResizeObserverDirective } from '../../../../shared/resize-observer.directive';
import { DataServer, SessionData } from '../../../../omnai-datasource/data-server';
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

  @Input() setViewTime!: (viewTime: { amount?: number, end?: number | null }) => void;

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

  private sessions: { start: number, end: number }[] = []

  private async draw() {
    const data = await this.dataSource.getData({ precision: PRECISION })

    this.sessions = dataToSessions(data)

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

    this.moveView()

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

  @ViewChild('cnt', { static: true })
  private cnt!: ElementRef<HTMLElement>;

  private pointerPosition: number | null = null;

  onPointerDown(event: PointerEvent) {
    const target = event.target as HTMLElement;
    target.setPointerCapture(event.pointerId);

    this.pointerPosition = event.clientX;
    this.moveView()
  }

  onPointerMove(event: PointerEvent) {
    if (!this.pointerPosition)
      return

    const bcr = this.cnt.nativeElement.getBoundingClientRect()
    const horizontalPosition = Math.max(0, Math.min(this.$svgWidth(), event.clientX - bcr.left));

    this.pointerPosition = horizontalPosition
    this.moveView()
  }

  onPointerUp() {
    this.pointerPosition = null;
  }

  onPointerCancel() {
    this.onPointerUp();
  }

  private moveView() {
    if (this.pointerPosition === null)
      return

    if (this.sessions.length === 0)
      return

    const viewTime = this.lastViewedTime()
    if (viewTime === null)
      return

    const fullDuration = this.sessions.reduce((acc, session) => acc + (session.end - session.start), 0)
    if (viewTime.amount >= fullDuration)
      return

    const relativePosition = this.pointerPosition / this.$svgWidth();

    const durationToPass = Math.max(viewTime.amount, fullDuration * relativePosition + viewTime.amount / 2)

    const sessionEnd = this.sessions[this.sessions.length - 1].end;

    let passed = 0;
    for (const session of this.sessions) {
      const duration = session.end - session.start;
      if (duration + passed >= durationToPass) {
        const time = session.start + (durationToPass - passed)
        if (time >= sessionEnd)
          this.setViewTime({ end: null })
        else
          this.setViewTime({ end: time })
        return
      }
      passed += duration
    }

    this.setViewTime({ end: null })
  }
}

function dataToSessions(data: SessionData[]): { start: number, end: number }[] {
  const sessions = []
  for (const session of data) {
    sessions.push({
      start: session.startTime,
      end: session.endTime
    })
  }
  return sessions
}
