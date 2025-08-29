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
import { InfoBoxComponent } from './info-box.component';
import { GraphStateService } from '../graph-state.service';

class ExampleGraphStateService {
  lastViewedTime = () => ({ start: 0, end: 100 });
  rawData = () => [
    {
      data: [
        {
          values: [10, 20, 30, 40, 50],
        },
      ],
    },
  ];
}

describe('InfoBoxComponent', () => {
  let component: InfoBoxComponent;
  let fixture: ComponentFixture<InfoBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoBoxComponent],
      providers: [
        { provide: GraphStateService, useClass: ExampleGraphStateService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InfoBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers lifecycle hooks
  });

  it('should create the info box component', () => {
    expect(component).toBeTruthy();
  });

  it('should correctly compute relativeMouseX', () => {
    component.windowWidth.set(1000);
    component.mouseX.set(250); // 25 / 100 = 0.25
    expect(component.relativeMouseX()).toBeCloseTo(0.25, 2);
  });

  it('should compute correct yVal_Channel0 from mock data', () => {
    component.windowWidth.set(1000);
    component.mouseX.set(400); // relativeMouseX = 0.4
    fixture.detectChanges();

    const index = component.positionToRead();
    const yValue = component.yVal_Channel0();

    expect(index).toBe(2); // floor(5 * 0.4)
    expect(yValue).toBe(30); // value at index 2 in example data
  });

});
