import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import VectorLayer from 'ol/layer/Vector';

export interface LayerEntry {
  name: string;
  layer: VectorLayer;
  visible: boolean;
  type: string;
}
 
@Injectable({ providedIn: 'root' })
export class LayersService {
  private layersListSubject = new BehaviorSubject<LayerEntry[]>([]);
  layersList$ = this.layersListSubject.asObservable();

  get layersList(): LayerEntry[] {
    return this.layersListSubject.getValue();
  }

  set layersList(list: LayerEntry[]) {
    this.layersListSubject.next(list);
  }

  addLayer(layer: LayerEntry) {
    const updated = [...this.layersList, layer];
    this.layersListSubject.next(updated);
  }

  // updateLayerVisibility(layer: LayerEntry, visible: boolean) {
  //   const updated = this.layersList.map(l =>
  //     l === layer ? { ...l, visible } : l
  //   );
  //   this.layersListSubject.next(updated);
  // }
  updateLayerVisibility(layer: VectorLayer, visible: boolean) {
      const layers = this.layersListSubject.getValue();
      const target = layers.find(l => l.layer === layer);
      if (target) {
          target.visible = visible;
          target.layer.setVisible(visible);
          this.layersListSubject.next(layers); // émet les nouvelles valeurs
      }
  }


  toggleLayerVisibility(name: string) {
      const layers = this.layersListSubject.getValue();
      const updated = layers.map(l => {
          if (l.name === name) {
              const newVisible = !l.visible;
              l.layer.setVisible(newVisible);
              return { ...l, visible: newVisible };
          }
          return l;
      });
      this.layersListSubject.next(updated);
  }


  clearLayers() {
    this.layersListSubject.next([]);
  }
}
