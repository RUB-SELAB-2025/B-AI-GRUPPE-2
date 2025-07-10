import { Injectable } from '@angular/core';
import { SessionData } from './data-server';

@Injectable({ providedIn: 'root' })
export class CsvExportService {
  toCsv(sessionData: SessionData[]): string {
    const headers = ['Session Start', 'Session End', 'Channel ID', 'Values'];
    const rows: string[] = [headers.join(',')];
    sessionData.forEach(session => {
      session.data.forEach(channelData => {
        const row = [
          session.startTime,
          session.endTime,
          channelData.channel.id,
          channelData.values.join(';')
        ];
        rows.push(row.join(','));
      });
    });
    return rows.join('\n');
  }

  triggerDownload(csv: string, filename = 'daten.csv') {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
