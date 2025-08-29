/*
MIT License

Copyright (c) 2025 AI-Gruppe

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { Component, ViewChild, AfterViewInit, OnDestroy, viewChild, AfterViewChecked, OnInit } from '@angular/core';
import { LineGraphComponent } from './graph/views/line-graph/line-graph.component';
import { RouterOutlet } from '@angular/router';
import { InfoBoxComponent } from './info-box/info-box.component';
import { CsvExportService } from './omnai-datasource/csv-export.service';
import { DummyDataService } from './omnai-datasource/dummy-data-server/dummy-data.service';
import { CommonModule } from '@angular/common';

import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatDividerModule} from '@angular/material/divider';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, InfoBoxComponent, MatButtonModule, MatIconModule, MatDividerModule, MatSlideToggleModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  standalone: true,
})
export class AppComponent implements AfterViewChecked, AfterViewInit, OnDestroy {
  title = 'OmnAIView';
  @ViewChild(LineGraphComponent) lineGraph!: LineGraphComponent;

  private handleKeyBound = this.handleKey.bind(this);
  private mousePos = false;
  private yVals = false;
  instructionSeen = false;

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

  ngOnInit() {
    this.instructionSeen = localStorage.getItem("instructionSeen") === "true";
  }

  closeModal() {
    this.instructionSeen = true;
    localStorage.setItem("instructionSeen", "true");
  }

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
      const infoBox = document.getElementById('info') as HTMLInputElement | null;

      if(this.mousePos){
        this.infoBoxComponent.MouseTrackerActive = true
      }
      else{
        this.infoBoxComponent.MouseTrackerActive = false
      }

      if(this.yVals){
        this.infoBoxComponent.yValDisplay = true
      }
      else{
        this.infoBoxComponent.yValDisplay = false
      }

      if(infoBox) {infoBox.style.display = 'none';}
    }


  mousePosCh(event : any) {
    this.mousePos = event.checked;
  }

  yValsCh(event : any) {
    this.yVals = event.checked;
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
