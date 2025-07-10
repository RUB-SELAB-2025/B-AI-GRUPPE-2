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
    component.windowWidth = 1000;
    component.mouseX.set(250); // 25 / 100 = 0.25
    expect(component.relativeMouseX()).toBeCloseTo(0.25, 2);
  });

  it('should compute correct yVal_Channel0 from mock data', () => {
    component.windowWidth = 1000;
    component.mouseX.set(400); // relativeMouseX = 0.4
    fixture.detectChanges();

    const index = component.positionToRead_Channel0();
    const yValue = component.yVal_Channel0();

    expect(index).toBe(2); // floor(5 * 0.4)
    expect(yValue).toBe(30); // value at index 2 in example data
  });

});
