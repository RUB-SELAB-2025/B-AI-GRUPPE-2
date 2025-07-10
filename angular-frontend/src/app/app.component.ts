/*import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  standalone: true
})
export class AppComponent {
  title = 'OmnAIView';
  
}*/


import { Component, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { LineGraphComponent } from './graph/views/line-graph/line-graph.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LineGraphComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  standalone: true,
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild(LineGraphComponent) lineGraph!: LineGraphComponent;

  private handleKeyBound = this.handleKey.bind(this);

  ngAfterViewInit() {
    window.addEventListener('keydown', this.handleKeyBound);
  }

  ngOnDestroy() {
    window.removeEventListener('keydown', this.handleKeyBound);
  }

  handleKey(event: KeyboardEvent) {
    console.log('AppComponent detected key:', event.key);
    if (this.lineGraph) {
      this.lineGraph.handleKey(event);
    } else {
      console.warn('LineGraphComponent not yet initialized');
    }
  }
}