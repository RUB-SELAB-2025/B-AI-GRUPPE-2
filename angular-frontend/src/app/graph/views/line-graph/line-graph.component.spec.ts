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

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LineGraphComponent } from './line-graph.component';

describe('LineGraphComponent', () => {
  let component: LineGraphComponent;
  let fixture: ComponentFixture<LineGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineGraphComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(LineGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  }, 10);

  it('should draw data', async () => {
    await sleep(100);
    const data = component.$drawn();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].path.trim().length).toBeGreaterThan(0);
    expect(data[0].color.trim().length).toBeGreaterThan(0);
  }, 200)

  it('should return valid viewed time', async () => {
    await sleep(100);
    const vt = component.getViewTime();
    expect(vt.end).toBe(Date.now());
    expect(vt.start).toBeGreaterThan(0);
    expect(vt.end - vt.start).toBeGreaterThan(0);
  }, 200)

  it('should set last viewed time', async () => {
    await sleep(100);
    const lvt = component.$lastViewedTime();
    expect(lvt).not.toBeNull();
    expect(lvt?.end).toBeNull();
  }, 200)

  it('should allow changing viewed time', async () => {
    await sleep(100);
    component.setViewTime({
      amount: 100,
      end: 500
    })
    await sleep(100);
    const lvt = component.$lastViewedTime();
    expect(lvt).not.toBeNull();
    expect(lvt?.amount).toBe(100);
    expect(lvt?.end).toBe(500);
  }, 500)

  it('should update svg width', async () => {
    await sleep(100);
    expect(component.$svgWidth()).not.toBe(0);
  }, 200)
});

function sleep(time: number): Promise<void> {
  return new Promise(res => setTimeout(res, time))
}
