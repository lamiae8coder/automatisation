import { Component, OnInit } from '@angular/core';
import { FeatureModalComponent } from '../feature-modal/feature-modal.component'; // adapte le chemin

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat, transform } from 'ol/proj';
import { toStringXY } from 'ol/coordinate';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import { saveAs } from 'file-saver';
import * as shpwrite from 'shp-write';
import { HttpClient } from '@angular/common/http';
import GeoJSON from 'ol/format/GeoJSON';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
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
import XYZ from 'ol/source/XYZ';
import { Modal } from 'bootstrap';
import { MatDialog } from '@angular/material/dialog';
import { getDistance } from 'ol/sphere';
import { toLonLat } from 'ol/proj';
import Text from 'ol/style/Text';
import { AffaireService } from '../services/affaire.service';

@Component({ 
  selector: 'app-dessin-exterieur',
  standalone: false,
  templateUrl: './dessin-exterieur.component.html',
  styleUrl: './dessin-exterieur.component.css'
})
export class DessinExterieurComponent implements OnInit {
  map!: Map;
  cursorCoords: string = '';
  osmLayer!: TileLayer;
  shapefileLayers: { layer: VectorLayer, name: string, visible: boolean }[] = [];
  popupOverlay!: Overlay;
  txtLayer!: VectorLayer; // Couche des points et polygone txt
  drawInteraction!: Draw;
  snapInteraction!: Snap;
  modifyInteraction!: Modify;
  vectorSource = new VectorSource();
  isDrawing: boolean = false; // Variable pour suivre l'état

  isMeasuringDistance = false;
  measurePoints: Coordinate[] = [];
  distanceResult: number | null = null;

  // Ajouter une couche dédiée pour afficher les points sélectionnés (optionnel)
  measureSource = new VectorSource();
  measureLayer!: VectorLayer;
  markerFeature: Feature | null = null; 
  showModalOnClick = false;

  constructor(private http: HttpClient,private affaireService: AffaireService, private dialog: MatDialog) {}

  ngOnInit(): void {
    proj4.defs('EPSG:26191', '+proj=lcc +lat_1=33.3 +lat_0=33.3 +lon_0=-5.4 +k_0=0.999625769 +x_0=500000 +y_0=300000 +ellps=clrk80ign +towgs84=31,146,47,0,0,0,0 +units=m +no_defs');
    register(proj4);

    this.osmLayer = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attributions: ''
      }),
      visible: true
    });

    this.map = new Map({
      target: 'map',
      layers: [this.osmLayer],
      view: new View({
        projection: 'EPSG:3857',
        center: fromLonLat([-5.4, 32.0]),
        zoom: 6
      })
    });

    const markerLayer = new VectorLayer({
      source: this.vectorSource,
    });

    this.map.addLayer(markerLayer);


    this.map.on('pointermove', (event) => {
      const coords = event.coordinate;
      const transformedCoords = transform(coords, 'EPSG:3857', 'EPSG:26191');
      this.cursorCoords = toStringXY(transformedCoords, 2) + ' (Lambert Merchich)';
    });

    const container = document.getElementById('popup') as HTMLElement;
    this.popupOverlay = new Overlay({
      element: container,
      autoPan: { animation: { duration: 250 } }
    });
    this.map.addOverlay(this.popupOverlay);

  
    this.measureLayer = new VectorLayer({
      source: this.measureSource,
      style: new Style({
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: 'orange' }),
          stroke: new Stroke({ color: 'white', width: 2 })
        }),
        stroke: new Stroke({
          color: 'orange',
          width: 2,
          lineDash: [10, 10]
        })
      })
    });
    this.map.addLayer(this.measureLayer);

     this.map.on('singleclick', (evt) => {
      if (!this.isMeasuringDistance) return;

      const coord = evt.coordinate;
      this.addMeasurePoint(coord);
    });

  

    this.map.on('singleclick', (event) => {
      if (!this.showModalOnClick) return; // Ne rien faire si désactivé

      const feature = this.map.forEachFeatureAtPixel(event.pixel, (feat) => feat);
      if (feature) {
        const properties = feature.getProperties();
        delete properties['geometry']; // Supprimer la géométrie brute

        this.dialog.open(FeatureModalComponent, {
          width: '600px',
          data: properties
        });
      }
    });

  }


   toggleDistanceMeasure() {
    this.isMeasuringDistance = !this.isMeasuringDistance;
    if (!this.isMeasuringDistance) {
      this.resetMeasure();
    } else {
      alert('Cliquez sur deux points sur la carte pour mesurer la distance.');
    }
  }

  addMeasurePoint(coord: Coordinate) {
    if (this.measurePoints.length >= 2) {
      this.resetMeasure();
    }

    this.measurePoints.push(coord);

    // Ajouter un point visuel sur la carte
    const pointFeature = new Feature(new Point(coord));
    this.measureSource.addFeature(pointFeature);

    if (this.measurePoints.length === 2) {
      this.calculateDistance();
    }
  }


  
  calculateDistance() {
    // Transformation de Lambert 26191 vers lon/lat (EPSG:4326)
    const coord1 = transform(this.measurePoints[0], 'EPSG:26191', 'EPSG:4326');
    const coord2 = transform(this.measurePoints[1], 'EPSG:26191', 'EPSG:4326');

    console.log("Point 1 EPSG:4326 :", coord1); // [lon, lat]
    console.log("Point 2 EPSG:4326 :", coord2);

    // getDistance prend des [lon, lat] (EPSG:4326)
    const dist = getDistance(coord1, coord2); // en mètres

    this.distanceResult = Math.round(dist);
    alert(`Distance entre les points : ${this.distanceResult} mètres`);
  }


  resetMeasure() {
    this.measurePoints = [];
    this.distanceResult = null;
    this.measureSource.clear();
  }


  importFile() {
    const input = document.getElementById('fileInput') as HTMLInputElement;
    input.click();
  }
  importFilee() {
    const input = document.getElementById('fileInputt') as HTMLInputElement;
    input.click();
  }

  handleFileInput(event: any) {
    const file = event.target.files[0];
    if (file && file.name.toLowerCase().endsWith('.zip')) {
      this.uploadShapefile(file);
    } else {
      alert('Format de fichier non pris en charge.');
    }
  }

  handleFileInputt(event: any) {
    const file = event.target.files[0];
    if (file && file.name.toLowerCase().endsWith('.zip')) {
      this.uploadShapefilee(file);
    } else {
      alert('Format de fichier non pris en charge.');
    }
  }

  uploadShapefile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    this.http.post('http://127.0.0.1:8000/upload-shapefile/', formData).subscribe({
      next: (geojson: any) => {
        console.log('GeoJSON reçu :', geojson);
        this.displayGeoJSON(geojson, file.name);
      },
      error: (err) => {
        alert('Erreur lors de l\'import du shapefile.');
        console.error(err);
      }
    });
  }
  uploadShapefilee(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    this.http.post('http://127.0.0.1:8000/upload-shapefilee/', formData).subscribe({
      next: (geojson: any) => {
        console.log('GeoJSON reçu :', geojson);
        this.displayGeoJSON(geojson, file.name);
      },
      error: (err) => {
        alert('Erreur lors de l\'import du shapefile.');
        console.error(err);
      }
    });
  }

  displayGeoJSON(geojson: any, fileName: string) {
    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(geojson, {
        dataProjection: 'EPSG:26191',
        featureProjection: 'EPSG:3857'
      })
    });

    const newLayer = new VectorLayer({
      source: vectorSource,
      visible: true,
      style: new Style({
        stroke: new Stroke({
          color: this.getRandomColor(),
          width: 1
        }),
        fill: new Fill({
          color: 'rgba(255, 0, 0, 0.2)'
        })
      })
    });

    this.map.addLayer(newLayer);

    this.shapefileLayers.push({
      layer: newLayer,
      name: fileName,
      visible: true
    });

    const extent = vectorSource.getExtent();
    this.map.getView().fit(extent, { duration: 1000, padding: [20, 20, 20, 20] });
  }

  toggleLayer(layer: string, visible: boolean) {
    if (layer === 'osm' && this.osmLayer) {
      this.osmLayer.setVisible(visible);
    }
  }

  toggleSpecificLayer(index: number, visible: boolean) {
    if (this.shapefileLayers[index]) {
      this.shapefileLayers[index].layer.setVisible(visible);
      this.shapefileLayers[index].visible = visible;
    }
  }

  getRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  getCheckedValue(event: Event): boolean {
    const target = event.target as HTMLInputElement | null;
    return target?.checked ?? false;
  }

  // Ouvre la boîte de dialogue pour sélectionner le fichier txt
  importTxtFile() {
    const input = document.getElementById('txtFileInput') as HTMLInputElement;
    input.click();
  }

  
  // Lecture et traitement du fichier txt
  handleTxtFileInput(event: any) {
    const file = event.target.files[0];
    if (file && file.name.toLowerCase().endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const content = e.target.result;
        this.displayTxtPoints(content);
      };
      reader.readAsText(file);
    } else {
      alert('Veuillez importer un fichier TXT.');
    }
  }

  

  displayTxtPoints(content: string) {
    const lines = content.split('\n');
    const features: Feature[] = [];

    for (let line of lines) {
      const parts = line.trim().split(' ');
      if (parts.length === 3) {
        const label = parts[0]; // Exemple : B16
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);

        if (!isNaN(x) && !isNaN(y)) {
          const coords = transform([x, y], 'EPSG:26191', 'EPSG:3857');

          const pointFeature = new Feature({
            geometry: new Point(coords),
            name: label
          });

          pointFeature.setStyle(new Style({
            image: new CircleStyle({
              radius: 5,
              fill: new Fill({ color: 'red' }),
              stroke: new Stroke({ color: 'white', width: 1 })
            }),
            text: new Text({
              text: label,
              offsetY: -12,
              font: '12px Calibri,sans-serif',
              fill: new Fill({ color: '#000' }),
              stroke: new Stroke({ color: '#fff', width: 2 })
            })
          }));


          features.push(pointFeature);
        }
      }
    }

    // Nettoyer la source si déjà utilisée
    this.vectorSource.clear();

    // Ajouter les points
    this.vectorSource.addFeatures(features);

    // Créer la couche si elle n'existe pas encore
    if (!this.txtLayer) {
      this.txtLayer = new VectorLayer({
        source: this.vectorSource
      });
      this.map.addLayer(this.txtLayer);
    }

    // Ajuster la vue si au moins un point
    if (features.length > 0) {
      const extent = this.vectorSource.getExtent();
      this.map.getView().fit(extent, { duration: 1000, padding: [20, 20, 20, 20] });
    }

    // Facultatif : autoriser la modification
    this.addModifySnap();
  }

  toggleModalOnClick() {
    this.showModalOnClick = !this.showModalOnClick;
    alert(this.showModalOnClick ? 'Clic activé pour afficher les informations.' : 'Clic désactivé.');
  }



  
  toggleDrawingMode() {
    if (this.isDrawing) {
      this.disableDrawing();
    } else {
      this.enableDrawing();
    }
  }




  enableDrawing() {
    // Supprimer les anciennes interactions
    if (this.drawInteraction) this.map.removeInteraction(this.drawInteraction);
    if (this.snapInteraction) this.map.removeInteraction(this.snapInteraction);
    if (this.modifyInteraction) this.map.removeInteraction(this.modifyInteraction);

    // Initialiser les interactions
    this.drawInteraction = new Draw({
      source: this.vectorSource,
      type: 'Polygon',
      finishCondition: (event) => {
        const pointerEvent = event.originalEvent as PointerEvent;
        return pointerEvent.button === 2; // Clic droit pour terminer
      }
    });

    this.snapInteraction = new Snap({ source: this.vectorSource });
    this.modifyInteraction = new Modify({ source: this.vectorSource });

    this.map.addInteraction(this.drawInteraction);
    this.map.addInteraction(this.snapInteraction);
    this.map.addInteraction(this.modifyInteraction);

    this.isDrawing = true;

    alert(' Mode dessin activé.\n👉 Cliquez gauche pour tracer.\n👉 Cliquez droit pour terminer.');

    // Quand le dessin est terminé
    this.drawInteraction.on('drawend', (event) => {
      this.disableDrawing();
      alert(' Dessin terminé.');

      const feature = event.feature;
      feature.setStyle(new Style({
        stroke: new Stroke({ color: 'yellow', width: 2 }),
        fill: new Fill({ color: 'rgba(216, 216, 210, 0.1)' })
      }));

      const geometry = feature.getGeometry();
      if (!geometry) {
        console.error(' Aucune géométrie trouvée.');
        return;
      }

      const extent = geometry.getExtent();
      this.map.getView().fit(extent, { duration: 1000, padding: [20, 20, 20, 20] });

      // 🔄 Convertir en GeoJSON (EPSG:26191)
      const geojsonFeature = new GeoJSON().writeFeatureObject(feature, {
        featureProjection: 'EPSG:3857',
        dataProjection: 'EPSG:26191'
      });

      console.log('📦 GeoJSON du polygone :', geojsonFeature);
      const affaireId = this.affaireService.getAffaireId();
      const payload = { geometry: geojsonFeature.geometry, affaire_id: affaireId };
      // 💾 Envoi à FastAPI
      this.http.post('http://127.0.0.1:8000/save-polygon/', payload).subscribe({
        next: (response) => {
          console.log('✅ Polygone sauvegardé côté backend.',response);
        },
        error: (err) => {
          console.error('❌ Erreur d’envoi du polygone :', err);
        }
      });
    });

    // ❌ Bloquer le menu contextuel
    this.map.getViewport().addEventListener('contextmenu', (e) => e.preventDefault());
  }



  disableDrawing() {
    if (this.drawInteraction) this.map.removeInteraction(this.drawInteraction);
    if (this.snapInteraction) this.map.removeInteraction(this.snapInteraction);
    if (this.modifyInteraction) this.map.removeInteraction(this.modifyInteraction);

    this.isDrawing = false;
  }


  addModifySnap() {
    if (this.modifyInteraction) this.map.removeInteraction(this.modifyInteraction);
    if (this.snapInteraction) this.map.removeInteraction(this.snapInteraction);

    this.modifyInteraction = new Modify({
      source: this.vectorSource
    });

    this.snapInteraction = new Snap({
      source: this.vectorSource
    });

    this.map.addInteraction(this.modifyInteraction);
    this.map.addInteraction(this.snapInteraction);
  }
  inputX: number | null = null;
  inputY: number | null = null;
  

    goToCoordinates() {
      if (this.inputX == null || this.inputY == null || isNaN(this.inputX) || isNaN(this.inputY)) {
        alert('Veuillez saisir des valeurs valides pour X et Y.');
        return;
      }

      try {
        const coords = transform([this.inputX, this.inputY], 'EPSG:26191', 'EPSG:3857');

        // Supprimer l'ancien marker s'il existe
        if (this.markerFeature) {
          this.vectorSource.removeFeature(this.markerFeature);
        }

        // Créer un nouveau marker
        this.markerFeature = new Feature({
          geometry: new Point(coords),
        });

        this.markerFeature.setStyle(new Style({
          image: new CircleStyle({
            radius: 7,
            fill: new Fill({ color: 'red' }),
            stroke: new Stroke({ color: '#fff', width: 2 }),
          }),
        }));

        this.vectorSource.addFeature(this.markerFeature);

        this.map.getView().animate({
          center: coords,
          zoom: 14,
          duration: 800,
        });

        // 🕐 Supprimer le marker après 5 secondes
        setTimeout(() => {
          if (this.markerFeature) {
            this.vectorSource.removeFeature(this.markerFeature);
            this.markerFeature = null;
          }
        }, 9000); // 5000 ms = 5 secondes

      } catch (error) {
        console.error('Erreur lors du traitement des coordonnées :', error);
        alert('Erreur lors de la transformation ou de l\'affichage du point.');
      }
    }


}
