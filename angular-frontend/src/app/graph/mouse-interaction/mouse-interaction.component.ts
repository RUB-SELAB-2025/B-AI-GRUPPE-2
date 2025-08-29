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

import {
  Component,
  viewChild,
  ElementRef,
  viewChildren,
} from '@angular/core';
import { diffieHellman } from 'node:crypto';
import { off } from 'node:process';

@Component({
  selector: 'g [app-mouse-interaction]',
  imports: [],
  templateUrl: './mouse-interaction.component.html',
  styleUrl: './mouse-interaction.component.css',
})

export class MouseInteractionComponent {
  readonly live_barRef = viewChild.required<ElementRef<SVGElement>>('live_bar');
  readonly text_containerRef = viewChild.required<ElementRef<SVGElement>>("text_container");
  readonly line_containerRef = viewChild.required<ElementRef<SVGElement>>("line_container");

  private height: number;
  private channels :number[] = [];
  public bars: {id: number, timestamp: number, color : string}[] = [];

  constructor() {
    this.height = 0;
  }

  public onMouseMove(event: MouseEvent) {
    const bar = this.live_barRef().nativeElement;
    const x = event.clientX;

    bar.setAttribute('x1', `${x}`);
    bar.setAttribute('x2', `${x}`);
    bar.setAttribute('y1', '0');
    bar.setAttribute('y2', `${this.height}`);

    bar.setAttribute('stroke', 'grey');

    for (const id of this.channels) {
      const text = document.getElementById(`live_bar_text${id}`) as unknown as SVGElement;
      text.setAttribute("x", `${x}`);
      text.setAttribute("y", `${25 + 15 * this.channels.indexOf(id)}`);
    }
  }

  public onMouseLeave(event: MouseEvent) {
    const bar = this.live_barRef().nativeElement;
    bar.setAttribute('stroke', 'none');

    for (const id of this.channels) {
      const text = document.getElementById(`live_bar_text${id}`) as unknown as SVGElement;
      text.innerHTML = "";
    }
  }

  public onClick(t: number) {
    if (this.bars.length >= 2) {
      return;
    }

    if (this.bars.length == 1) {
      if (t < this.bars[0].timestamp) {
        return;
      }
    }

    const preset = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    preset.setAttribute("y1", "0");
    preset.setAttribute("y2", `${this.height}`);
    preset.setAttribute("stroke", this.bars.length == 0 ? "green" : "red");
    preset.setAttribute("id", `bar${this.bars.length}`)

    this.bars.push({"id": this.bars.length, "timestamp": t, color: this.bars.length == 0 ? "green" : "red"});

    const container = this.line_containerRef().nativeElement;

    container.appendChild(preset);
  }

  public getHeight(dimensions: { width: number; height: number }) {
    this.height = dimensions.height;
  }

  public addNewText(id: number) {
    const container = this.text_containerRef().nativeElement;
    const preset = `<text id="live_bar_text${id}" x="0" y="0" stroke="none"></text>`;

    if (!this.channels.includes(id)){
      this.channels.push(id);

      container.innerHTML += preset;
    }
  }

  public setText(id: number, value: number, color: any) {
    const text = document.getElementById(`live_bar_text${id}`) as unknown as SVGElement;

    text.innerHTML = `${value.toFixed(2)}`;

    text.setAttribute("stroke", color);
  }

  public updateBars(start: number, end: number, amount_points: number, width_svg: number) {
    for (const bar of this.bars) {
      const line = document.getElementById(`bar${bar.id}`)

      if (!(bar.timestamp > start && bar.timestamp < end)) {
        line?.setAttribute("stroke", "none");
        continue;
      }

      line?.setAttribute("stroke", bar.color)

      const offset = width_svg / amount_points;

      const x_pos = (bar.timestamp - start) * offset;

      line?.setAttribute("x1", `${x_pos}`);
      line?.setAttribute("x2", `${x_pos}`);

    }
  }
}
