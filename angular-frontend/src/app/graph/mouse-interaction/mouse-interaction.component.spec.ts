import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MouseInteractionComponent } from './mouse-interaction.component';

describe('MouseInteractionComponent', () => {
  let component: MouseInteractionComponent;
  let fixture: ComponentFixture<MouseInteractionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MouseInteractionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MouseInteractionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
