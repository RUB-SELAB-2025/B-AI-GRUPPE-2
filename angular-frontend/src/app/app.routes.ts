import { Routes } from '@angular/router';
import { GraphComponent } from './graph/graph.component';
import { MouseTrackerComponent } from './shared/mouse-tracker/mouse-tracker.component';
import { InfoBoxComponent } from './info-box/info-box.component';
import { RenderMode } from '@angular/ssr';

export const routes: Routes = [
  {
    path: 'graph',
    children: [
      {
        path: 'main',
        component: GraphComponent,
        
      }
    ],
  },
  {
    path: "shared/mouse-tracker",
    component: MouseTrackerComponent,
  },
  {
    path: "info-box",
    component: InfoBoxComponent,
  },
  {
  path: '**',
  redirectTo: 'graph/main'
}

];
