import { Component, ViewChild, AfterViewChecked, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InfoBoxComponent } from './info-box/info-box.component';
import { LineGraphComponent } from './graph/views/line-graph/line-graph.component';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet,InfoBoxComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  standalone: true
})
export class AppComponent implements AfterViewChecked {
  title = 'OmnAIView';
  ModifyWindow = false
  outlet = viewChild(RouterOutlet);

  //Get Child Component
  @ViewChild(InfoBoxComponent)
  infoBoxComponent!: InfoBoxComponent;


  anwenden() {
      const abtast = document.getElementById('abtast') as HTMLInputElement | null;
      const projInfo = document.getElementById('proj-info') as HTMLInputElement | null;
      const mousePos = document.getElementById('mousePos') as HTMLInputElement | null;
      const infoBox = document.getElementById('info') as HTMLInputElement | null;

      if(mousePos && mousePos.checked){
        this.infoBoxComponent.MouseTrackerActive = true
      }
      else{
        this.infoBoxComponent.MouseTrackerActive = false
      }


      if(infoBox) {infoBox.style.display = 'none';}
    }

  ngAfterViewChecked(): void {
      if (typeof window !== "undefined") {
        (window as any).pauseGraph = () => {
          const cmp = this.outlet()?.component;
          if (cmp instanceof LineGraphComponent) {
            cmp.setPause();
          }
        }
      }
  }

}
