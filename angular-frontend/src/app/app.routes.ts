import { Routes } from '@angular/router';
import { RenderMode } from '@angular/ssr';
import { LineGraphComponent } from './graph/views/line-graph/line-graph.component';

export const routes: Routes = [
  {
    path: 'graph',
    children: [
      {
        path: 'main',
        component: LineGraphComponent,

      }
    ],
  },
  {
  path: '**',
  redirectTo: 'graph/main'
}

];