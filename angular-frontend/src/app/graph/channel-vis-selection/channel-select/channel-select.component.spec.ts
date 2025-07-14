import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChannelSelectComponent } from './channel-select.component';
import { LineGraphComponent } from '../../views/line-graph/line-graph.component';

describe('ChannelSelectComponent', () => {
  let component: ChannelSelectComponent;
  let fixture: ComponentFixture<ChannelSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChannelSelectComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ChannelSelectComponent);
    component = fixture.componentInstance;

    const graph = TestBed.createComponent(LineGraphComponent);
    component.channels = graph.componentInstance.$channels;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  }, 10);
});
