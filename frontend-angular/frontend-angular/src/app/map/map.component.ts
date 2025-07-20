import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { MapService } from '../services/map.service';

@Component({
  selector: 'app-map',
  standalone: false,
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent implements AfterViewInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  constructor(private mapService: MapService) { }

  ngAfterViewInit() {
    this.mapService.initMap(this.mapContainer.nativeElement);
  }
}