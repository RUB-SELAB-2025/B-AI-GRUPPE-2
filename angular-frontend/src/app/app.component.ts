import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MouseTrackerComponent } from './shared/mouse-tracker/mouse-tracker.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,MouseTrackerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  standalone: true
})
export class AppComponent {
  title = 'OmnAIView';

  anwenden() {
      const abtast = document.getElementById('abtast') as HTMLInputElement | null;
      const projInfo = document.getElementById('proj-info') as HTMLInputElement | null;
      const mousePos = document.getElementById('mousePos') as HTMLInputElement | null;
      const infoBox = document.getElementById('info') as HTMLInputElement | null;

      console.log("Abtastrate:", abtast);
      console.log("Projekt Info:", projInfo);

      if(mousePos && mousePos.checked){
        const mouseTracker = document.getElementById("mouseTracker");
        if (mouseTracker) {
          mouseTracker.style.display = 'block';
        }
      }


      if(infoBox) {infoBox.style.display = 'none';}
    }
  
}
