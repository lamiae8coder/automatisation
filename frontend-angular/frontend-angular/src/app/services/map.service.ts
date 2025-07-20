import { Injectable } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import { register } from 'ol/proj/proj4';
import proj4 from 'proj4';
import { get as getProjection } from 'ol/proj';
import { Component,ElementRef,ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { FeatureModalComponent } from '../feature-modal/feature-modal.component'; // adapte le chemin

import OSM from 'ol/source/OSM';
import { fromLonLat, transform } from 'ol/proj';
import { toStringXY } from 'ol/coordinate';
import { saveAs } from 'file-saver';
import * as shpwrite from 'shp-write';
import { HttpClient } from '@angular/common/http';
import GeoJSON from 'ol/format/GeoJSON';
import { Style } from 'ol/style';
import { Icon, Style as PointStyle , Fill, Stroke, RegularShape } from 'ol/style';
import Overlay from 'ol/Overlay';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Circle as CircleStyle } from 'ol/style';
import Draw from 'ol/interaction/Draw';
import Snap from 'ol/interaction/Snap';
import Modify from 'ol/interaction/Modify';
import Polygon from 'ol/geom/Polygon';
import type { Coordinate } from 'ol/coordinate';
import * as olSphere from 'ol/sphere';
import { buffer as bufferOp } from '@turf/turf';  // ajoute turf dans ton projet (npm i @turf/turf)
import * as turf from '@turf/turf';
import { Modal } from 'bootstrap';
import { MatDialog } from '@angular/material/dialog';
import { getDistance } from 'ol/sphere';
import { toLonLat } from 'ol/proj';
import Text from 'ol/style/Text';
import { AffaireService } from '../services/affaire.service';
import LineString from 'ol/geom/LineString';
import { Geometry } from 'ol/geom';
import { AffaireProgressService } from '../services/affaire-progress.service'; // adapte le chemin selon ta structure
import {MapStateService}  from '../services/map-state.service';



@Injectable({ providedIn: 'root' })
export class MapService {
  private map!: Map;
  private vectorLayer!: VectorLayer<any>;
  private vectorSource!: VectorSource<any>;
  private baseLayer!: TileLayer<any>;

  constructor() {
    // Définir et enregistrer la projection EPSG:26191
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
      const coord = evt.coordinate;
      const lonLat = toLonLat(coord);
      container.innerText = `Coordonnées : ${lonLat[0].toFixed(5)}, ${lonLat[1].toFixed(5)}`;
    });

    // Vide les coordonnées quand la souris quitte la carte
    this.map.getViewport().addEventListener('mouseout', () => {
      container.innerText = 'Coordonnées : -';
    });
  }



  toggleLayer(layerName: string, visible: boolean) {
    switch (layerName) {
      case 'osm':
        if (this.baseLayer ) {
          this.baseLayer .setVisible(visible);
        }
        break;
      case 'base':
      case 'satellite':
        if (this.baseLayer) {
          this.baseLayer.setVisible(visible);
        }
        break;
      case 'vector':
        if (this.vectorLayer) {
          this.vectorLayer.setVisible(visible);
        }
        break;
      default:
        console.warn(`🔎 Aucun layer trouvé pour le nom : ${layerName}`);
        break;
    }
  }
  

  /**
   * Fournit l'instance de la carte
   */
  getMap(): Map {
    return this.map;
  }

  /**
   * Fournit la source vectorielle pour ajouter des features
   */
  getVectorSource(): VectorSource {
    return this.vectorSource;
  }

  /**
   * Fournit la couche vectorielle
   */
  getVectorLayer(): VectorLayer {
    return this.vectorLayer;
  }
}
