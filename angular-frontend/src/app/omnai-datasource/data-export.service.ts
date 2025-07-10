imoprt { Component } from '@angular/code';
import { DataServer, DataOptions, SessionData, ChannelData } from "./data-server.ts";

@Component({
  selector: 'app-download-csv',
  template: '<button (click)="downloadCsv()">CSV Speichern</button>'
})
export Class DownloadCsvComponent {
  constructor(private dataServer: DataServer) {}

  async downloadCsv() {
    // TODO: getDCata
    // TODO: Convert to cvs
    // TODO: Download
    // TODO: Create Header
  }
}
