import { Component, Input, Signal } from '@angular/core';
import { ChannelViewData } from '../../views/line-graph/line-graph.component';

@Component({
  selector: 'app-channel-select',
  imports: [],
  standalone: true,
  templateUrl: './channel-select.component.html',
  styleUrl: './channel-select.component.css',
})
export class ChannelSelectComponent {
  @Input() channels!: Signal<ChannelViewData[]>
}
