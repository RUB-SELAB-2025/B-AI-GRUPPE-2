import { Component, HostListener, inject, signal, computed} from '@angular/core';
import { LineGraphComponent } from '../graph/views/line-graph/line-graph.component';
import { GraphStateService } from '../graph-state.service';  // adjust the path


@Component({
  selector: 'app-info-box',
  imports: [],
  providers: [LineGraphComponent],
  templateUrl: './info-box.component.html',
  styleUrl: './info-box.component.css'
})
export class InfoBoxComponent {

  constructor(public graphState: GraphStateService) {}

  //Graph parameters
  windowWidth = window.innerWidth;

  // Reactively access lastViewedTime from LineGraphComponent
  readonly lastViewedTime = computed(() => this.graphState.lastViewedTime());
  readonly lastViewedTime_end = computed(() => this.graphState.lastViewedTime().end);
  readonly lastViewedTime_diff = computed(() =>
    this.lastViewedTime().end - this.lastViewedTime().start
  );
  readonly lastViewedData = computed(() => this.graphState.rawData());

  //readonly lastViewedData = computed(() => this.LineGraphComponent.lastViewedData()[0].data[0].values); //erste session, erster channel

  //calculate y-Value
  readonly positionToRead_Channel0 = computed(() => Math.floor((this.graphState.rawData()[0].data[0].values.length)*this.relativeMouseX()));
  readonly yVal_Channel0 = computed(() => this.lastViewedData()[0].data[0].values[this.positionToRead_Channel0()]);

  //Mouse tracking signals
  readonly mouseX = signal(0);
  readonly mouseY = signal(0);

  //This will automatically update when mouseX or windowWidth changes
  readonly relativeMouseX = computed(() =>
    Math.floor(this.mouseX() / this.windowWidth *100)/100
  );
  

  //Which Elements to display
  MouseTrackerActive = false
  

  @HostListener('document:mousemove', ['$event'])
  handleMouseMove(event: MouseEvent) {
    this.mouseX.set(event.clientX);
    this.mouseY.set(event.clientY);
    //console.log(this.lastViewedData()[0].data[0].values);
  }
}
