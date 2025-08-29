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

import { Routes } from '@angular/router';
import { LineGraphComponent } from './graph/views/line-graph/line-graph.component';
import { MouseTrackerComponent } from './shared/mouse-tracker/mouse-tracker.component';
import { InfoBoxComponent } from './info-box/info-box.component';
import { RenderMode } from '@angular/ssr';


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
