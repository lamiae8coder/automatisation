

import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import GeoJSON from 'ol/format/GeoJSON';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { Style, Stroke, Fill, Text as TextStyle, Circle as CircleStyle } from 'ol/style';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';

@Component({
  selector: 'app-pieces-mec',
  standalone: false,
  templateUrl: './pieces-mec.component.html',
  styleUrls: ['./pieces-mec.component.css']
})
export class PiecesMecComponent  {
entities: any[] = [];

  constructor(private http: HttpClient) {}

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);

      this.http.post<any>('http://localhost:8000/upload-dxf', formData)
        .subscribe(response => {
          this.entities = response.entities;
        });
    }
  }

}
