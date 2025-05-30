import { Component, HostListener} from '@angular/core';

@Component({
  selector: 'app-info-box',
  imports: [],
  templateUrl: './info-box.component.html',
  styleUrl: './info-box.component.css'
})
export class InfoBoxComponent {

  //Mousetracker
  mouseX = 0;
  mouseY = 0;

  //Which Elements to display
  MouseTrackerActive = false

  @HostListener('document:mousemove', ['$event'])
  handleMouseMove(event: MouseEvent) {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
  }
}
