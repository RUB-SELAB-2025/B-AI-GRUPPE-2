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
