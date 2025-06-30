import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root'  // makes it available everywhere automatically
})
export class GraphStateService {
  // Signals to hold shared state
  public readonly lastViewedTime: WritableSignal<{ start: number, end: number }> = signal({ start: 0, end: 0 });

}

