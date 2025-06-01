import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChannelSelectComponent } from './channel-select.component';

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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
