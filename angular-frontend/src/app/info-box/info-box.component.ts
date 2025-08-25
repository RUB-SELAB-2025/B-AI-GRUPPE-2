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

  firstTimeSet = false;
  firstTime = 0;

  readonly lastViewedTime_diff = computed(() => {
    if(!this.firstTimeSet && this.lastViewedTime_start() != 0){
      this.firstTime = this.lastViewedTime_start();
      this.firstTimeSet = true;
    }
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

  // Add this computed signal to your class
readonly yVals = computed(() => {
  // Get the raw data and the current reading position
  const rawData = this.lastViewedData();
  const position = this.positionToRead();

  // Return an empty array if the data structure isn't ready
  if (!rawData || !rawData[0]?.data) {
    return [];
  }

  // Map over each channel's data to get the corresponding value at the mouse position
  return rawData[0].data.map(channel => {
    const values = channel.values;
    // Check if values exist and if the position is valid
    const val = (values && position >= 0 && position < values.length) ? values[position] : undefined;
    
    // Round the value to 2 decimal places if it's a number, otherwise return 0
    return typeof val === 'number' ? Math.round(val * 100) / 100 : 0;
  });
});

  //this.lastViewedData()[0]?.data?  length
  //loop and make array with yVals

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

  MouseTrackerActive = true;
  yValDisplay = true;
  displayedChannel = 0;

  @HostListener('document:mousemove', ['$event'])
  handleMouseMove(event: MouseEvent) {
    this.mouseX.set(event.clientX);
    this.mouseY.set(event.clientY);
  }
}