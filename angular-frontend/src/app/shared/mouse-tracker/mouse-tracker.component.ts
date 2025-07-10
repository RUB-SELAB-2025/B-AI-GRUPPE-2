import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-mouse-tracker',
  templateUrl: './mouse-tracker.component.html',
  styleUrl: './mouse-tracker.component.css'
})

export class MouseTrackerComponent {
  mouseX = 0;
  mouseY = 0;

  @HostListener('document:mousemove', ['$event'])
  handleMouseMove(event: MouseEvent) {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
  }
}
