import { Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InfoBoxComponent } from './info-box/info-box.component';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet,InfoBoxComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  standalone: true
})
export class AppComponent {
  title = 'OmnAIView';
  ModifyWindow = false

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
  
}
