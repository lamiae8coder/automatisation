



import { Component,ElementRef,ViewChild, AfterViewInit, OnInit } from '@angular/core';
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
import LineString from 'ol/geom/LineString';
import { Geometry } from 'ol/geom';
import { AffaireProgressService } from '../services/affaire-progress.service'; // adapte le chemin selon ta structure
import {MapStateService}  from '../services/map-state.service';
import {MapService}  from '../services/map.service';
import { LayersService } from '../services/layers.service';


@Component({ 
  selector: 'app-dessin-exterieur',
  standalone: false,
  templateUrl: './dessin-exterieur.component.html',
  styleUrl: './dessin-exterieur.component.css'
})
export class DessinExterieurComponent implements AfterViewInit {


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
  currentMode: 'edit' | 'delete' | 'classify' | null = null;
  affaireTitre: string = '';

  private tempLineFeature: Feature<LineString> | null = null;
  
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  constructor(public progressService: AffaireProgressService,private layersService: LayersService,private mapService: MapService,private mapStateService: MapStateService ,private http: HttpClient,private affaireService: AffaireService, private dialog: MatDialog) {}

  ngAfterViewInit() {
    this.mapService.initMap(this.mapContainer.nativeElement,'coords');
    this.map = this.mapService.getMap();
    this.vectorSource = new VectorSource();
    const markerLayer = new VectorLayer({ source: this.vectorSource });
    this.map.addLayer(markerLayer);

    this.popupOverlay = new Overlay({
      element: document.getElementById('popup') as HTMLElement,
      autoPan: { animation: { duration: 250 } }
    });
    this.map.addOverlay(this.popupOverlay);

    this.measureLayer = new VectorLayer({
      source: this.measureSource,
      zIndex: 1002,
      style: new Style({
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({ color: 'yellow' }),
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

    this.map.on('pointermove', (event) => {
      const coords = event.coordinate;
      const transformedCoords = transform(coords, 'EPSG:3857', 'EPSG:26191');
      this.cursorCoords = toStringXY(transformedCoords, 2) + ' (Lambert Merchich)';
    });

    this.map.on('singleclick', (evt) => {
      if (this.isMeasuringDistance) {
        this.addMeasurePoint(evt.coordinate);
        return;
      }

      if (!this.showModalOnClick) return;

      const feature = this.map.forEachFeatureAtPixel(evt.pixel, (feat) => feat);
      if (feature) {
        const properties = { ...feature.getProperties() };
        delete properties['geometry'];

        const geom = feature.getGeometry();
        if (geom instanceof Point) {
          const coord = transform(geom.getCoordinates(), 'EPSG:3857', 'EPSG:26191');
          properties['X'] = coord[0].toFixed(2);
          properties['Y'] = coord[1].toFixed(2);
        } else if (geom instanceof LineString) {
          const coords = geom.getCoordinates().map(c =>
            transform(c, 'EPSG:3857', 'EPSG:26191')
          );
          properties['Coordonnées ligne'] = coords.map((c, i) =>
            `Point ${i + 1}: X=${c[0].toFixed(2)}, Y=${c[1].toFixed(2)}`
          ).join('\n');
        } else if (geom instanceof Polygon) {
          const rings = geom.getCoordinates();
          const coordText = rings.map((ring, i) => {
            const coords = ring.map(c =>
              transform(c, 'EPSG:3857', 'EPSG:26191')
            );
            return `Anneau ${i + 1}:\n` + coords.map((c, j) =>
              `  Point ${j + 1}: X=${c[0].toFixed(2)}, Y=${c[1].toFixed(2)}`
            ).join('\n');
          }).join('\n\n');

          properties['Coordonnées polygone'] = coordText;
        }

        this.dialog.open(FeatureModalComponent, {
          width: '600px',
          data: properties
        });
      }
    });

    this.map.on('pointermove', (evt) => {
      if (this.isMeasuringDistance && this.measurePoints.length === 1) {
        const line = new LineString([this.measurePoints[0], evt.coordinate]);
        if (!this.tempLineFeature) {
          this.tempLineFeature = new Feature(line);
          this.tempLineFeature.setStyle(new Style({
            stroke: new Stroke({
              color: 'blue',
              width: 2,
              lineDash: [10, 10]
            })
          }));
          this.measureSource.addFeature(this.tempLineFeature);
        } else {
          this.tempLineFeature.setGeometry(line);
        }
      }
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        this.removeLastDrawPoint();
      }
    });


    const affaireId = this.affaireService.getAffaireId();
    if (affaireId) {
      this.affaireService.getAffaireDetails(affaireId).subscribe({
        next: data => {
          this.affaireTitre = data.titremec;
        },
        error: err => {
          console.error('Erreur lors du chargement de l’affaire', err);
        }
      });
    }

    this.mapService.shapefileLayers$.subscribe(layers => {
      this.shapefileLayers = layers;
    });
  }

  zoomIn() {
    const view = this.mapService.getMap().getView();
    view.setZoom(view.getZoom()! + 1);
  }
 

    toggleDistanceMeasure() {
    this.isMeasuringDistance = !this.isMeasuringDistance;
    if (!this.isMeasuringDistance) {
      this.resetMeasure();
    } else {
      alert('Cliquez sur deux points sur la carte pour mesurer la distance.');
    }
  }

  removeLastDrawPoint() {
    if (this.drawInteraction) {
      this.drawInteraction.removeLastPoint();
    }
  }

  // addMeasurePoint(coord: Coordinate) {
  //   if (this.measurePoints.length >= 2) {
  //     this.resetMeasure();
  //   }

  //   this.measurePoints.push(coord);

  //   // Ajouter un point visuel sur la carte
  //   const pointFeature = new Feature(new Point(coord));
  //   this.measureSource.addFeature(pointFeature);

  //   if (this.measurePoints.length === 2) {
  //     this.calculateDistance();
  //   }
  // }


  addMeasurePoint(coord: Coordinate) {
    if (this.measurePoints.length >= 2) {
      this.resetMeasure();
    }

    this.measurePoints.push(coord);

    const pointFeature = new Feature(new Point(coord));
    this.measureSource.addFeature(pointFeature);

    // Si c'est le 2e point, finaliser la ligne
    if (this.measurePoints.length === 2) {
      if (this.tempLineFeature) {
        this.tempLineFeature = null; // On garde la ligne actuelle
      }
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
    // alert(`Distance entre les points : ${this.distanceResult} mètres`);
    setTimeout(() => {
      alert(`Distance entre les points : ${this.distanceResult} mètres`);
    }, 0);

  }


  // resetMeasure() {
  //   this.measurePoints = [];
  //   this.distanceResult = null;
  //   this.measureSource.clear();
  // }
  resetMeasure() {
    this.measurePoints = [];
    this.distanceResult = null;
    this.measureSource.clear();
    this.tempLineFeature = null;
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
    event.target.value = '';
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
    const affaireId = this.affaireService.getAffaireId();

    if (!affaireId) {
      alert("Aucun ID d'affaire disponible !");
      return;  // bloque si pas d'ID
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('affaire_id', affaireId.toString());

    this.http.post('http://127.0.0.1:8000/upload-shapefilee/', formData).subscribe({
      next: (geojson: any) => {
        console.log('GeoJSON reçu :', geojson);
        this.displayGeoJSON(geojson, file.name);
        this.progressService.markStep2Completed();
      },
      error: (err) => {
        if (err.error && err.error.error) {
          alert(err.error.error);
        } else {
          alert('Erreur lors de l\'import du shapefile.');
        }
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
  

    // this.vectorSource.addFeatures(vectorSource);

    


    const newLayer = new VectorLayer({
      source: vectorSource,
      zIndex: 10,
      visible: true,
      style: new Style({
        stroke: new Stroke({
          color: 'rgba(60, 47, 248, 0.91)',
          width: 1
        }),
        fill: new Fill({
          color: 'rgba(33, 18, 241, 0.2)'
        })
      })
    });

    this.map.addLayer(newLayer);

    this.shapefileLayers.push({
      layer: newLayer,
      name: fileName,
      visible: true
    });
    this.mapService.addShapefileLayer(newLayer, fileName);


    const extent = vectorSource.getExtent();
    this.map.getView().fit(extent, { duration: 1000, padding: [20, 20, 20, 20] });

    // // 🔻 ici, utilise bien `vectorSource` !
    // this.mapStateService.setFeatures(this.vectorSource.getFeatures());
    // this.mapStateService.saveToLocalStorage();
  }





  // displayGeoJSON(geojson: any, fileName: string) {
  //   const vectorSource = new VectorSource({
  //     features: new GeoJSON().readFeatures(geojson, {
  //       dataProjection: 'EPSG:26191',
  //       featureProjection: 'EPSG:3857'
  //     })
  //   });

  //   const newLayer = new VectorLayer({
  //     source: vectorSource,
  //     zIndex: 10,
  //     visible: true,
  //     style: new Style({
  //       stroke: new Stroke({
  //         color: 'rgba(60, 47, 248, 0.91)',
  //         width: 1
  //       }),
  //       fill: new Fill({
  //         color: 'rgba(33, 18, 241, 0.2)'
  //       })
  //     })
  //   });

  //   this.map.addLayer(newLayer);

  //   this.shapefileLayers.push({
  //     layer: newLayer,
  //     name: fileName,
  //     visible: true
  //   });
    
  //   const extent = vectorSource.getExtent();
  //   this.map.getView().fit(extent, { duration: 1000, padding: [20, 20, 20, 20] });
  //   // sauvegarder les features dans le MapStateService
  //   this.mapStateService.setFeatures(this.vectorSource.getFeatures());
  //   this.mapStateService.saveToLocalStorage();


  // }

  toggleLayer(layer: string, visible: boolean) {
    
    this.mapService.toggleLayer(layer, visible);
  }
 
  toggleSpecificLayer(index: number, visible: boolean) {
    // if (this.shapefileLayers[index]) {
    //   this.shapefileLayers[index].layer.setVisible(visible);
    //   this.shapefileLayers[index].visible = visible;
    // }
    this.mapService.updateShapefileVisibility(index, visible);
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

  

  // displayTxtPoints(content: string) {
  //   const lines = content.split('\n');
  //   const features: Feature[] = [];

  //   for (let line of lines) {
  //     const parts = line.trim().split(' ');
  //     if (parts.length === 3) {
  //       const label = parts[0]; // Exemple : B16
  //       const x = parseFloat(parts[1]);
  //       const y = parseFloat(parts[2]);

  //       if (!isNaN(x) && !isNaN(y)) {
  //         const coords = transform([x, y], 'EPSG:26191', 'EPSG:3857');

  //         const pointFeature = new Feature({
  //           geometry: new Point(coords),
  //           name: label
  //         });

  //         pointFeature.setStyle(new Style({
  //           image: new CircleStyle({
  //             radius: 5,
  //             fill: new Fill({ color: 'green' }),
  //             stroke: new Stroke({ color: 'white', width: 1 })
  //           }),
  //           text: new Text({
  //             text: label,
  //             offsetY: -12,
  //             font: '12px Calibri,sans-serif',
  //             fill: new Fill({ color: '#000' }),
  //             stroke: new Stroke({ color: '#fff', width: 2 })
  //           })
  //         }));


  //         features.push(pointFeature);
  //         this.vectorSource.addFeatures(features);
  //         // this.mapStateService.setFeatures(this.vectorSource.getFeatures());
  //         // this.mapStateService.saveToLocalStorage();
  //       }
  //     }
  //   }

  //   // Nettoyer la source si déjà utilisée
  //   this.vectorSource.clear();

  //   this.vectorSource.addFeatures(features);


  //   // Créer la couche si elle n'existe pas encore
  //   if (!this.txtLayer) {
  //     this.txtLayer = new VectorLayer({
  //       source: this.vectorSource,
  //       zIndex: 1001,
  //     });
  //     this.map.addLayer(this.txtLayer);
  //   }

  //   // Ajuster la vue si au moins un point
  //   if (features.length > 0) {
  //     const extent = this.vectorSource.getExtent();
  //     this.map.getView().fit(extent, { duration: 1000, padding: [20, 20, 20, 20] });
  //   }

  //   // Facultatif : autoriser la modification
  //   this.addModifySnap();
  // }



  displayTxtPoints(content: string) {
    const map = this.mapService.getMap(); // récupère la carte depuis le service
    if (!map) {
      console.error('La carte n’est pas initialisée');
      return;
    }

    const lines = content.trim().split('\n');
    const features: Feature[] = [];

    for (let line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length === 3) {
        const label = parts[0];
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
              fill: new Fill({ color: 'green' }),
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

    this.vectorSource.addFeatures(features);
    if (!this.vectorSource) {
      this.vectorSource = new VectorSource();
    } else {
      this.vectorSource.clear();
    }

    this.vectorSource.addFeatures(features);

    if (!this.txtLayer) {
      this.txtLayer = new VectorLayer({
        source: this.vectorSource,
        zIndex: 1001,
      });
      map.addLayer(this.txtLayer);
      this.mapService.addShapefileLayer(this.txtLayer, 'Zone dessinée');
    }

    if (features.length > 0) {
      const extent = this.vectorSource.getExtent();
      map.getView().fit(extent, { duration: 1000, padding: [20, 20, 20, 20] });
    }

    this.addModifySnap?.();
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




  

  // enableDrawing() {
  //   this.disableDrawing(); // Nettoyer avant

  //   alert('✅ Mode dessin ACTIVÉ.\n👉 Cliquez droit pour dessiner.\n👉 Cliquez gauche pour terminer.');

  //   this.isDrawing = true;

  //   this.drawInteraction = new Draw({
  //     source: this.vectorSource,
  //     type: 'Polygon',
  //     // On utilise finishCondition pour terminer au clic gauche
  //     finishCondition: (event) => {
  //       const pointerEvent = event.originalEvent as PointerEvent;
  //       return pointerEvent.button === 0; // Clic gauche pour terminer
  //     }
  //   });

  //   // Ajout de l’interaction snap
  //   this.snapInteraction = new Snap({ source: this.vectorSource });
  //   this.map.addInteraction(this.drawInteraction);
  //   this.map.addInteraction(this.snapInteraction);

  //   let sketch: Feature<Geometry> | null = null;

  //   // Capture de la géométrie en cours
  //   this.drawInteraction.on('drawstart', (evt) => {
  //     sketch = evt.feature;
  //   });

  //   this.drawInteraction.on('drawend', (evt) => {
  //     this.disableDrawing();
  //     alert('✏️ Dessin terminé.');

  //     const feature = evt.feature;
  //     feature.setStyle(new Style({
  //       stroke: new Stroke({ color: 'red', width: 2 }),
  //       fill: new Fill({ color: 'rgba(238, 25, 25, 0.1)' })
  //     }));

  //     const geojsonFeature = new GeoJSON().writeFeatureObject(feature, {
  //       featureProjection: 'EPSG:3857',
  //       dataProjection: 'EPSG:26191'
  //     });

  //     const affaireId = this.affaireService.getAffaireId();
  //     const payload = { geometry: geojsonFeature.geometry, affaire_id: affaireId };

  //     this.http.post('http://127.0.0.1:8000/save-polygon/', payload).subscribe({
  //       next: (response) => {
  //         console.log('✅ Polygone sauvegardé côté backend.', response);
  //       },
  //       error: (err) => {
  //         console.error('❌ Erreur d’envoi du polygone :', err);
  //       }
  //     });
  //   });

  //   // Ajouter un sommet au clic droit
  //   this.map.getViewport().addEventListener('contextmenu', (e) => {
  //     e.preventDefault(); // empêcher le menu
  //     if (!this.isDrawing || !sketch) return;

  //     const pixel = this.map.getEventPixel(e);
  //     const coordinate = this.map.getCoordinateFromPixel(pixel);

  //     const geom = sketch.getGeometry() as Polygon;
  //     const coords = geom.getCoordinates()[0];

  //     coords.splice(coords.length - 1, 0, coordinate); // ajouter le point avant le dernier (car le dernier est temporaire)
  //     geom.setCoordinates([coords]);
  //   });
  // }

 



  enableDrawing() {
    this.disableDrawing(); // Nettoyer avant

    alert('✅ Mode dessin ACTIVÉ.\n👉 Cliquez droit pour dessiner.\n👉 Cliquez gauche pour terminer.');

    this.isDrawing = true;

    this.drawInteraction = new Draw({
      source: this.vectorSource,
      type: 'Polygon',
      finishCondition: (event) => {
        const pointerEvent = event.originalEvent as PointerEvent;
        return pointerEvent.button === 0; // Clic gauche pour terminer
      }
    });

    this.snapInteraction = new Snap({ source: this.vectorSource });
    this.map.addInteraction(this.drawInteraction);
    this.map.addInteraction(this.snapInteraction);

    let sketch: Feature<Geometry> | null = null;

    this.drawInteraction.on('drawstart', (evt) => {
      sketch = evt.feature;
    });

    this.drawInteraction.on('drawend', (evt) => {
      this.disableDrawing();
      alert('✏️ Dessin terminé.');

      const feature = evt.feature;

      // Appliquer style
      feature.setStyle(new Style({
        stroke: new Stroke({ color: 'red', width: 2 }),
        fill: new Fill({ color: 'rgba(238, 25, 25, 0.1)' })
      }));

      // --- AJOUT ICI ---
      this.addNewFeature(feature);  // Sauvegarde dans vectorSource + service
      
      // Ton code d’envoi au backend
      const geojsonFeature = new GeoJSON().writeFeatureObject(feature, {
        featureProjection: 'EPSG:3857',
        dataProjection: 'EPSG:26191'
      });
 
      const affaireId = this.affaireService.getAffaireId();
      const payload = { geometry: geojsonFeature.geometry, affaire_id: affaireId };

      this.http.post('http://127.0.0.1:8000/save-polygon/', payload).subscribe({
        next: (response) => {
          console.log('✅ Polygone sauvegardé côté backend.', response);
        },
        error: (err) => {
          console.error('❌ Erreur d’envoi du polygone :', err);
        }
      });
    });

    this.map.getViewport().addEventListener('contextmenu', (e) => {
      e.preventDefault(); // empêcher le menu
      if (!this.isDrawing || !sketch) return;

      const pixel = this.map.getEventPixel(e);
      const coordinate = this.map.getCoordinateFromPixel(pixel);

      const geom = sketch.getGeometry() as Polygon;
      const coords = geom.getCoordinates()[0];

      coords.splice(coords.length - 1, 0, coordinate);
      geom.setCoordinates([coords]);
    });
  }


    // enableDrawing() {
    //   this.disableDrawing(); // Nettoyer avant

    //   alert('✅ Mode dessin ACTIVÉ.\n👉 Cliquez droit pour dessiner.\n👉 Cliquez gauche pour terminer.');

    //   this.isDrawing = true;

    //   this.drawInteraction = new Draw({
    //     source: this.vectorSource,
    //     type: 'Polygon',
    //     finishCondition: (event) => {
    //       const pointerEvent = event.originalEvent as PointerEvent;
    //       return pointerEvent.button === 0; // Clic gauche pour terminer
    //     }
    //   });

    //   this.snapInteraction = new Snap({ source: this.vectorSource });
    //   this.map.addInteraction(this.drawInteraction);
    //   this.map.addInteraction(this.snapInteraction);

    //   let sketch: Feature<Geometry> | null = null;

    //   this.drawInteraction.on('drawstart', (evt) => {
    //     sketch = evt.feature;
    //   });

    //   this.drawInteraction.on('drawend', (evt) => {
    //     this.disableDrawing();
    //     alert('✏️ Dessin terminé.');

    //     const feature = evt.feature;

    //     // Appliquer style
    //     feature.setStyle(new Style({
    //       stroke: new Stroke({ color: 'red', width: 2 }),
    //       fill: new Fill({ color: 'rgba(238, 25, 25, 0.1)' })
    //     }));
    //      // ➕ Ajoute le polygone à la source commune
    //     this.vectorSource.addFeature(feature);
    //     // --- AJOUT ICI ---
    //     this.addNewFeature(feature);  // Sauvegarde dans vectorSource + service

    //     // Ton code d’envoi au backend
    //     const geojsonFeature = new GeoJSON().writeFeatureObject(feature, {
    //       featureProjection: 'EPSG:3857',
    //       dataProjection: 'EPSG:26191'
    //     });

    //     const affaireId = this.affaireService.getAffaireId();
    //     const payload = { geometry: geojsonFeature.geometry, affaire_id: affaireId };

    //     this.http.post('http://127.0.0.1:8000/save-polygon/', payload).subscribe({
    //       next: (response) => {
    //         console.log('✅ Polygone sauvegardé côté backend.', response);
    //       },
    //       error: (err) => {
    //         console.error('❌ Erreur d’envoi du polygone :', err);
    //       }
    //     });
    //   });

    //   this.map.getViewport().addEventListener('contextmenu', (e) => {
    //     e.preventDefault(); // empêcher le menu
    //     if (!this.isDrawing || !sketch) return;

    //     const pixel = this.map.getEventPixel(e);
    //     const coordinate = this.map.getCoordinateFromPixel(pixel);

    //     const geom = sketch.getGeometry() as Polygon;
    //     const coords = geom.getCoordinates()[0];

    //     coords.splice(coords.length - 1, 0, coordinate);
    //     geom.setCoordinates([coords]);
    //   });
    // }
 


  // Ta méthode à ajouter dans la classe du composant
  addNewFeature(feature: Feature) {
    this.vectorSource.addFeature(feature);
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
