import { Routes } from '@angular/router';
import { LineGraphComponent } from './graph/views/line-graph/line-graph.component';
import { RenderMode } from '@angular/ssr';

export const routes: Routes = [
  {
    path: 'graph',
    children: [
      {
        path: 'main',
        component: LineGraphComponent,
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'graph/main',
  },
];
