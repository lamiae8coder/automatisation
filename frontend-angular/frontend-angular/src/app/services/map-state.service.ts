import { Injectable } from '@angular/core';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';

@Injectable({
  providedIn: 'root'
})
export class MapStateService {
  private features: Feature[] = [];

  getFeatures(): Feature[] {
    return this.features;
  }

  setFeatures(features: Feature[]): void {
    this.features = features;
  }

  addFeature(feature: Feature): void {
    this.features.push(feature);
  }

  

  clear(): void {
    this.features = [];
  }


saveToLocalStorage() {
    const geojson = new GeoJSON();
    const featuresGeoJSON = this.features.map(f => geojson.writeFeatureObject(f));
    localStorage.setItem('savedFeatures', JSON.stringify(featuresGeoJSON));
}

    loadFromLocalStorage(): void {
        const saved = localStorage.getItem('features');
        if (saved) {
        const loadedFeatures = new GeoJSON().readFeatures(saved, {
            featureProjection: 'EPSG:3857', // ou 26191 selon ton usage
            dataProjection: 'EPSG:3857'
        });
        this.features = loadedFeatures;
        } else {
        this.features = [];
        }
    }



}
