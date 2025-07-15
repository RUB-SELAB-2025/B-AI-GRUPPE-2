import { Component, HostListener, inject, signal, computed } from '@angular/core';
import { GraphStateService } from '../graph-state.service';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-info-box',
  imports: [CommonModule],
  templateUrl: './info-box.component.html',
  styleUrl: './info-box.component.css'
})
export class InfoBoxComponent {

  public graphState = inject(GraphStateService);

  //Graph parameters
  //windowWidth should be a signal to react to window resizes
  windowWidth = signal(window.innerWidth);

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.windowWidth.set(window.innerWidth);
  }

  //Data to handle
  readonly lastViewedTime = computed(() => this.graphState.lastViewedTime());

  //optional chaining, provide a default value 0 if lastViewedTime() is undefined
  readonly lastViewedTime_end = computed(() => this.lastViewedTime()?.end ?? 0);
  readonly lastViewedTime_start = computed(() => this.lastViewedTime()?.start ?? 0);

  readonly lastViewedTime_diff = computed(() => {
    const start = this.lastViewedTime_start();
    const end = this.lastViewedTime_end();
    return end - start;
  });

  readonly lastViewedData = computed(() => this.graphState.rawData());

  //mouse tracking signals
  readonly mouseX = signal(0);
  readonly mouseY = signal(0);

  //automatically updated if mouseX or windowWidth changes
  readonly relativeMouseX = computed(() => {
    const mouseXVal = this.mouseX();
    const windowWidthVal = this.windowWidth(); // Access the signal's value
    //check if windowWidth is not zero, no division by zero
    return windowWidthVal > 0 ? Math.floor((mouseXVal / windowWidthVal) * 100) / 100 : 0;
  });

  //Calculate y-Value and position
  //Optional chaining, provide default values
  readonly positionToRead = computed(() => {
    const rawData = this.lastViewedData();
    //0 if data structure isn't ready.
    const valuesLength = rawData[0]?.data?.[0]?.values?.length ?? 0;
    //Math.round for the the nearest whole index.
    return Math.round(valuesLength * this.relativeMouseX());
  });

  readonly yVal_Channel0 = computed(() => {
    const values = this.lastViewedData()[0]?.data?.[0]?.values; //index 0 for channel 0
    const position = this.positionToRead();
    //check if values exist and if position is valid
    const val = (values && position >= 0 && position < values.length) ? values[position] : undefined;
    //rounding to 2 decimal places if val is a number
    return typeof val === 'number' ? Math.round(val * 100) / 100 : 0;
  });

  readonly yVal_Channel1 = computed(() => {
    const values = this.lastViewedData()[0]?.data?.[1]?.values; //index 1 for channel 1
    const position = this.positionToRead();
    const val = (values && position >= 0 && position < values.length) ? values[position] : undefined;
    return typeof val === 'number' ? Math.round(val * 100) / 100 : undefined; // Or 0, or null
  });

  //X Coordinate of the mouse
  readonly xVal = computed(() => {
    const start = this.lastViewedTime_start();
    const diff = this.lastViewedTime_diff();
    const relativeX = this.relativeMouseX();
    //calculation only if start and diff are valid numbers
    if (typeof start === 'number' && typeof diff === 'number') {
      return Math.floor(start + diff * relativeX);
    }
    return 0; // default value if data is not ready
  });

  MouseTrackerActive = false;
  displayedChannel = 0;

  @HostListener('document:mousemove', ['$event'])
  handleMouseMove(event: MouseEvent) {
    this.mouseX.set(event.clientX);
    this.mouseY.set(event.clientY);
  }
}