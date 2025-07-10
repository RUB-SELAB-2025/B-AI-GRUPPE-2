import { Component, ViewChild, AfterViewChecked, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InfoBoxComponent } from './info-box/info-box.component';
import { LineGraphComponent } from './graph/views/line-graph/line-graph.component';
import { CsvExportService } from './omnai-datasource/csv-export.service';
import { DummyDataService } from './omnai-datasource/dummy-data-server/dummy-data.service';

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
  constructor(
    private dataServer: DummyDataService,
    private csvExport: CsvExportService,
  ) {}

  @ViewChild(InfoBoxComponent)
  infoBoxComponent!: InfoBoxComponent;

  async download() {
    const sessionData = await this.dataServer.getData();
    const csv = this.csvExport.toCsv(sessionData);
    this.csvExport.triggerDownload(csv, 'data.csv');
  }

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
