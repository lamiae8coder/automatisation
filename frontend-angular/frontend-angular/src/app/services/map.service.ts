

import { Injectable } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import { register } from 'ol/proj/proj4';
import proj4 from 'proj4';
import { fromLonLat, toLonLat } from 'ol/proj';
import { BehaviorSubject } from 'rxjs';
import Snap from 'ol/interaction/Snap';
import Modify from 'ol/interaction/Modify';
interface ShapefileLayer {
  name: string;
  visible: boolean;
  layer: VectorLayer;
}

@Injectable({ providedIn: 'root' })
export class MapService {
  private map!: Map;
  private vectorLayer!: VectorLayer;
  private vectorSource!: VectorSource;
  private baseLayer!: TileLayer;
  modifyInteraction: Modify | null = null;
  snapInteraction: Snap | null = null;
  currentMode: string = 'edit';


  private shapefileLayersSubject = new BehaviorSubject<ShapefileLayer[]>([]);
  shapefileLayers$ = this.shapefileLayersSubject.asObservable();

  constructor() {
    proj4.defs(
      'EPSG:26191',
      '+proj=lcc +lat_1=33.3 +lat_0=33.3 +lon_0=-5.4 +k_0=0.999625769 +x_0=500000 +y_0=300000 +ellps=clrk80ign +towgs84=31,146,47,0,0,0,0 +units=m +no_defs'
    );
    register(proj4);
  }

  /**
   * Initialise la carte si elle n'existe pas encore
   */
  initMap(target: HTMLElement, coordsContainerId?: string) {
    if (!this.map) {
      console.log('🌍 Création de la carte avec EPSG:26191');

      this.baseLayer = new TileLayer({
        source: new XYZ({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attributions: ''
        })
      });

      this.vectorSource = new VectorSource();
      this.vectorLayer = new VectorLayer({
        source: this.vectorSource
      });

      this.map = new Map({
        target,
        layers: [this.baseLayer, this.vectorLayer],
        view: new View({
          projection: 'EPSG:3857',
          center: fromLonLat([-5.4, 32.0]),
          zoom: 6
        })
      });

      if (coordsContainerId) {
        this.showCoordinates(coordsContainerId);
      }
    } else {
      console.log('♻️ Réutilisation de la carte existante');
      this.map.setTarget(target);
    }
  }

  /**
   * Affiche les coordonnées de la souris dans un élément HTML
   */
  showCoordinates(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`🚫 Container pour coordonnées introuvable : ${containerId}`);
      return;
    }

    this.map.on('pointermove', (evt) => {
      const lonLat = toLonLat(evt.coordinate);
      container.innerText = `Coordonnées : ${lonLat[0].toFixed(5)}, ${lonLat[1].toFixed(5)}`;
    });

    this.map.getViewport().addEventListener('mouseout', () => {
      container.innerText = 'Coordonnées : -';
    });
  }

  /**
   * Change la visibilité d'une couche de base ou vectorielle
   */
  toggleLayer(layerName: string, visible: boolean) {
    switch (layerName) {
      case 'osm':
      case 'base':
      case 'satellite':
        if (this.baseLayer) {
          this.baseLayer.setVisible(visible);
        }
        break;
      case 'vector':
        // if (this.vectorLayer) {
        //   this.vectorLayer.setVisible(visible);
        // }
        this.setVectorLayerVisible(visible);
        break;
      default:
        console.warn(`🔎 Aucun layer trouvé pour le nom : ${layerName}`);
        break;
    }
  }

  setVectorLayerVisible(visible: boolean) {
    if (this.vectorLayer) {
      this.vectorLayer.setVisible(visible);
    }

    if (!visible) {
      if (this.modifyInteraction) this.map.removeInteraction(this.modifyInteraction);
      if (this.snapInteraction) this.map.removeInteraction(this.snapInteraction);
      this.vectorSource.clear();
    } else {
      this.addModifySnap();
    }
  }

  addModifySnap() {
    if (this.modifyInteraction) this.map.removeInteraction(this.modifyInteraction);
    if (this.snapInteraction) this.map.removeInteraction(this.snapInteraction);

    this.modifyInteraction = new Modify({
      source: this.vectorSource,
      condition: (event) => {
        // Empêcher modification sauf si on est dans le bon mode
        return this.currentMode === 'edit';
      }
    });

    this.snapInteraction = new Snap({
      source: this.vectorSource
    });

    this.map.addInteraction(this.modifyInteraction);
    this.map.addInteraction(this.snapInteraction);
  }



  /**
   * Ajoute un shapefile layer s'il n'existe pas déjà
   */
  addShapefileLayer(layer: VectorLayer, name: string) {
    const current = this.shapefileLayersSubject.getValue();

    if (current.some(l => l.name === name)) {
      console.warn(`🚫 La couche "${name}" existe déjà.`);
      return;
    }

    const newLayer: ShapefileLayer = {
      name,
      visible: true,
      layer
    };

    // Ajoute la couche sur la carte
    this.map.addLayer(layer);

    this.shapefileLayersSubject.next([...current, newLayer]);
  }

  /**
   * Met à jour la visibilité d'une couche shapefile
   */
  updateShapefileVisibility(index: number, visible: boolean) {
    const layers = [...this.shapefileLayersSubject.getValue()];
    if (layers[index]) {
      layers[index].visible = visible;
      layers[index].layer.setVisible(visible);
      this.shapefileLayersSubject.next(layers);
    }
  }

  /**
   * Fournit l'instance de la carte
   */
  getMap(): Map {
    return this.map;
  }

  getVectorSource(): VectorSource {
    return this.vectorSource;
  }

  getVectorLayer(): VectorLayer {
    return this.vectorLayer;
  }
}
