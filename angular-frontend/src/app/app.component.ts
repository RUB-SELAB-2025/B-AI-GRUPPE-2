import { Component, viewChild, AfterViewChecked} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LineGraphComponent } from './graph/views/line-graph/line-graph.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  standalone: true
})

export class AppComponent implements AfterViewChecked {
  outlet = viewChild(RouterOutlet);

  title = 'OmnAIView';

  ngAfterViewChecked() {
    if (typeof window !== 'undefined') {
      (window as any).pauseGraph = () => {
        const cmp = this.outlet()?.component;
        if (cmp instanceof LineGraphComponent) {
          cmp.setPause();
        }
      };
    }
  }
}


