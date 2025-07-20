import { AfterViewInit,Component,OnInit, ViewChild, ElementRef } from '@angular/core';
import { FeatureModalComponent } from '../feature-modal/feature-modal.component'; // adapte le chemin
import { NatureDialogComponent } from '../nature-dialog/nature-dialog.component';
import { Geometry as OLGeometry, LinearRing, MultiLineString, MultiPolygon } from 'ol/geom';

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
import { Geometry } from 'geojson';
import GeometryCollection from 'ol/geom/GeometryCollection';
import MultiPoint from 'ol/geom/MultiPoint';
import Select from 'ol/interaction/Select';
import { click,platformModifierKeyOnly, pointerMove, altKeyOnly } from 'ol/events/condition';
import Collection from 'ol/Collection';
import OlMap from 'ol/Map'; // ✅ renommage
import DragBox from 'ol/interaction/DragBox';
import { boundingExtent } from 'ol/extent';
import { always } from 'ol/events/condition';
import { HostListener } from '@angular/core';
import LineString from 'ol/geom/LineString';
// import * as jsts from 'jsts';
import OlFeature from 'ol/Feature';
import { feature } from '@turf/helpers';
import type { Feature as GeoJSONFeature, Polygon as GeoJSONPolygon } from 'geojson';
import olFeature from 'ol/Feature';
import lineSplit from '@turf/line-split';
import { FeatureLike } from 'ol/Feature';
import {MapService}  from '../services/map.service';



@Component({
  selector: 'app-importer-dessin',
  standalone: false,
  templateUrl: './importer-dessin.component.html',
  styleUrls: ['./importer-dessin.component.css'] // 🪄 corrigé ici
})
export class ImporterDessinComponent implements AfterViewInit{
    @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
    @ViewChild('popup', { static: false }) popupRef!: ElementRef;
    // @ViewChild('mapContainer') mapContainer!: ElementRef;

    map!: Map;
    cursorCoords: string = '';
    osmLayer!: TileLayer;
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
    affaireTitre: string = '';

    // Ajouter une couche dédiée pour afficher les points sélectionnés (optionnel)
    measureSource = new VectorSource();
    measureLayer!: VectorLayer;
    markerFeature: Feature | null = null; 
    markerSource = new VectorSource();
    markerLayer = new VectorLayer({
      source: this.markerSource,
      zIndex: 9999,  // Très au-dessus
    });
    showModalOnClick = false;
    layersList: { name: string, layer: VectorLayer, visible: boolean, type:string }[] = [];
    modifyInteractionn?: Modify;
    selectedLayerForModify: VectorLayer | null = null;
    selectInteraction: Select | null = null;
    selectedFeatures: Collection<Feature> = new Collection();

    sourceLayerForMove: VectorLayer | null = null;

    private tempLineFeature: Feature<LineString> | null = null;
    activeEditableLayer: VectorLayer | null = null;
    
    editingLayer: VectorLayer | null = null;
    classificationActive: boolean = false;
    classificationLayer: VectorLayer | null = null;
    layerNatureOptions: globalThis.Map<VectorLayer<any>, string[]> = new globalThis.Map();
  
    layerColorMap: { [layerName: string]: string } = {};

    private dragBoxInteraction: DragBox | null = null;
    private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
    undoStack: any[] = [];
    trimmedLineSource!: VectorSource;
    trimmedLineLayer!: VectorLayer;
    lineSource!: VectorSource;


    constructor(private http: HttpClient,private affaireService: AffaireService,private mapService: MapService, private dialog: MatDialog) {}
  
    
//     ngOnInit(): void {
//     proj4.defs('EPSG:26191', '+proj=lcc +lat_1=33.3 +lat_0=33.3 +lon_0=-5.4 +k_0=0.999625769 +x_0=500000 +y_0=300000 +ellps=clrk80ign +towgs84=31,146,47,0,0,0,0 +units=m +no_defs');
//     register(proj4);
//   }

//   ngAfterViewInit(): void {
//     this.initMap();
//   }


  ngAfterViewInit() {
    this.mapService.initMap(this.mapContainer.nativeElement);
    this.map = this.mapService.getMap();
    this.vectorSource = new VectorSource();
    const markerLayer = new VectorLayer({ source: this.vectorSource });
    this.map.addLayer(markerLayer);

    this.popupOverlay = new Overlay({
      element: document.getElementById('popup') as HTMLElement,
      autoPan: { animation: { duration: 250 } }
    });
    this.map.addOverlay(this.popupOverlay);

    // 🧵 Trimmed line layer
    this.trimmedLineSource = new VectorSource();
    this.trimmedLineLayer = new VectorLayer({
      source: this.trimmedLineSource,
      style: new Style({
        stroke: new Stroke({
          color: 'blue',
          width: 2,
          lineDash: [4, 4]
        })
      })
    });
    this.map.addLayer(this.trimmedLineLayer);

   

    // 📐 Measure Layer
    this.measureLayer = new VectorLayer({
      source: this.measureSource,
      zIndex: 10000,
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

    // 🎯 Events
    this.map.on('pointermove', (event) => {
      const coords = event.coordinate;
      const transformedCoords = transform(coords, 'EPSG:3857', 'EPSG:26191');
      this.cursorCoords = `${transformedCoords[0].toFixed(2)}, ${transformedCoords[1].toFixed(2)} (Lambert Merchich)`;

      if (this.isMeasuringDistance && this.measurePoints.length === 1) {
        const line = new LineString([this.measurePoints[0], event.coordinate]);
        if (!this.tempLineFeature) {
          this.tempLineFeature = new Feature(line);
          this.tempLineFeature.setStyle(
            new Style({
              stroke: new Stroke({ color: 'blue', width: 2, lineDash: [10, 10] })
            })
          );
          this.measureSource.addFeature(this.tempLineFeature);
        } else {
          this.tempLineFeature.setGeometry(line);
        }
      }
    });

    this.map.on('singleclick', (evt) => {
      if (this.isMeasuringDistance) {
        this.addMeasurePoint(evt.coordinate);
        return;
      }

      if (!this.showModalOnClick) return;

      const feature = this.map.forEachFeatureAtPixel(evt.pixel, (f) => f);
      if (feature) {
        const properties = { ...feature.getProperties() };
        delete properties['geometry'];

        const geom = feature.getGeometry();
        if (geom instanceof Point) {
          const coord = transform(geom.getCoordinates(), 'EPSG:3857', 'EPSG:26191');
          properties['X'] = coord[0].toFixed(2);
          properties['Y'] = coord[1].toFixed(2);
        } else if (geom instanceof LineString) {
          const coords = geom.getCoordinates().map(c => transform(c, 'EPSG:3857', 'EPSG:26191'));
          properties['Coordonnées ligne'] = coords
            .map((c, i) => `Point ${i + 1}: X=${c[0].toFixed(2)}, Y=${c[1].toFixed(2)}`)
            .join('\n');
        } else if (geom instanceof Polygon) {
          const rings = geom.getCoordinates();
          properties['Coordonnées polygone'] = rings.map((ring, i) => {
            const coords = ring.map(c => transform(c, 'EPSG:3857', 'EPSG:26191'));
            return `Anneau ${i + 1}:\n` + coords.map((c, j) =>
              `  Point ${j + 1}: X=${c[0].toFixed(2)}, Y=${c[1].toFixed(2)}`
            ).join('\n');
          }).join('\n\n');
        }

        this.dialog.open(FeatureModalComponent, {
          width: '600px',
          data: properties
        });
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
  }


//   private initMap(): void {
//     this.osmLayer = new TileLayer({
//       source: new XYZ({
//         url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
//         attributions: ''
//       }),
//       visible: true
//     });

//     this.map = new Map({
//       target: this.mapContainer.nativeElement,
//       layers: [this.osmLayer],
//       view: new View({
//         projection: 'EPSG:3857',
//         center: fromLonLat([-5.4, 32.0]),
//         zoom: 6
//       })
//     });


//     this.trimmedLineSource = new VectorSource();
//     this.trimmedLineLayer = new VectorLayer({
//       source: this.trimmedLineSource,
//       style: new Style({
//         stroke: new Stroke({
//           color: 'blue',
//           width: 2,
//           lineDash: [4, 4]
//         })
//       })
//     });
//     this.map.addLayer(this.trimmedLineLayer);
    


//     const markerLayer = new VectorLayer({ source: this.vectorSource });
//     this.map.addLayer(markerLayer);

//     this.popupOverlay = new Overlay({
//       element: this.popupRef.nativeElement,
//       autoPan: { animation: { duration: 250 } }
//     });
//     this.map.addOverlay(this.popupOverlay);

//     this.measureLayer = new VectorLayer({
//       source: this.measureSource,
//       zIndex: 10000,
//       style: new Style({
//         image: new CircleStyle({
//           radius: 6,
//           fill: new Fill({ color: 'orange' }),
//           stroke: new Stroke({ color: 'white', width: 2 })
//         }),
//         stroke: new Stroke({
//           color: 'orange',
//           width: 2,
//           lineDash: [10, 10]
//         })
//       })
//     });
//     this.map.addLayer(this.measureLayer);

//     this.map.on('pointermove', (event) => {
//       const coords = event.coordinate;
//       const transformedCoords = transform(coords, 'EPSG:3857', 'EPSG:26191');
//       this.cursorCoords = `${transformedCoords[0].toFixed(2)}, ${transformedCoords[1].toFixed(2)} (Lambert Merchich)`;

//       if (this.isMeasuringDistance && this.measurePoints.length === 1) {
//         const line = new LineString([this.measurePoints[0], event.coordinate]);
//         if (!this.tempLineFeature) {
//           this.tempLineFeature = new Feature(line);
//           this.tempLineFeature.setStyle(
//             new Style({
//               stroke: new Stroke({ color: 'blue', width: 2, lineDash: [10, 10] })
//             })
//           );
//           this.measureSource.addFeature(this.tempLineFeature);
//         } else {
//           this.tempLineFeature.setGeometry(line);
//         }
//       }
//     });

//     this.map.on('singleclick', (evt) => {
//       if (this.isMeasuringDistance) {
//         this.addMeasurePoint(evt.coordinate);
//         return;
//       }

//       if (!this.showModalOnClick) return;

//       const feature = this.map.forEachFeatureAtPixel(evt.pixel, (f) => f);
//       if (feature) {
//         const properties = { ...feature.getProperties() };
//         delete properties['geometry'];

//         const geom = feature.getGeometry();
//         if (geom instanceof Point) {
//           const coord = transform(geom.getCoordinates(), 'EPSG:3857', 'EPSG:26191');
//           properties['X'] = coord[0].toFixed(2);
//           properties['Y'] = coord[1].toFixed(2);
//         } else if (geom instanceof LineString) {
//           const coords = geom.getCoordinates().map(c => transform(c, 'EPSG:3857', 'EPSG:26191'));
//           properties['Coordonnées ligne'] = coords
//             .map((c, i) => `Point ${i + 1}: X=${c[0].toFixed(2)}, Y=${c[1].toFixed(2)}`)
//             .join('\n');
//         } else if (geom instanceof Polygon) {
//           const rings = geom.getCoordinates();
//           properties['Coordonnées polygone'] = rings.map((ring, i) => {
//             const coords = ring.map(c => transform(c, 'EPSG:3857', 'EPSG:26191'));
//             return `Anneau ${i + 1}:\n` + coords.map((c, j) =>
//               `  Point ${j + 1}: X=${c[0].toFixed(2)}, Y=${c[1].toFixed(2)}`
//             ).join('\n');
//           }).join('\n\n');
//         }

//         this.dialog.open(FeatureModalComponent, {
//           width: '600px',
//           data: properties
//         });
//       }
//     });

//     window.addEventListener('keydown', (e: KeyboardEvent) => {
//       if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
//         this.removeLastDrawPoint();
//       }
//     });

//     const affaireId = this.affaireService.getAffaireId();
//     if (affaireId) {
//       this.affaireService.getAffaireDetails(affaireId).subscribe({
//         next: data => {
//           this.affaireTitre = data.titremec;
//         },
//         error: err => {
//           console.error('Erreur lors du chargement de l’affaire', err);
//         }
//       });
//     }
//   }

//    ngOnDestroy(): void {
//     if (this.map) this.map.setTarget(undefined);
//   }



  

    removeLastDrawPoint() {
      if (this.drawInteraction) {
        this.drawInteraction.removeLastPoint();
      }
    }


    cancelDrawing() {
      if (this.drawInteraction) {
        this.map.removeInteraction(this.drawInteraction);
        this.drawInteraction = null as any;
      }

      if (this.snapInteraction) {
        this.map.removeInteraction(this.snapInteraction);
        this.snapInteraction = null as any;
      }

      this.isDrawing = false;
      alert("Dessin annulé.");
    }




    

    
   


    
  
    startConnectingLines() {
  const lineLayerInfo = this.layersList.find(l => l.type === 'line');
  const polygonLayerInfo = this.layersList.find(l => l.type === 'polygon');

  if (!lineLayerInfo || !polygonLayerInfo) {
    alert('Les couches lignes ou polygones ne sont pas chargées.');
    return;
  }

  const lineLayer = lineLayerInfo.layer;
  const polygonLayer = polygonLayerInfo.layer;

  // Nettoyage des anciennes interactions
  if (this.drawInteraction) this.map.removeInteraction(this.drawInteraction);
  if (this.snapInteraction) this.map.removeInteraction(this.snapInteraction);

  // Source temporaire pour le dessin
  const tempSource = new VectorSource();

  // Création de l'interaction dessin (type LineString pour tracer polygone)
  this.drawInteraction = new Draw({
    source: tempSource,
    type: 'Polygon',
  });

  this.map.addInteraction(this.drawInteraction);

  // Snap sur couche lignes
  const snapLine = new Snap({
    source: lineLayer.getSource()!
  });
  this.map.addInteraction(snapLine);

  // Snap sur couche polygones
  const snapPolygon = new Snap({
    source: polygonLayer.getSource()!
  });
  this.map.addInteraction(snapPolygon);

  this.snapInteraction = snapLine; // pour nettoyage plus tard

  this.isDrawing = true;

  this.drawInteraction.on('drawend', (evt) => {
    const feature = evt.feature;
    const geom = feature.getGeometry() as Polygon;

    if (!geom) {
      alert('Erreur géométrique.');
      this.cleanupDrawing();
      return;
    }

    let coords: Coordinate[] = geom.getCoordinates()[0]; // premier anneau

    // Fermer la boucle si non fermée
    const firstPoint = coords[0];
    const lastPoint = coords[coords.length - 1];
    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
      coords = [...coords, firstPoint];
    }

    if (coords.length < 4) { // 3 points + fermeture
      alert('Il faut au moins 3 points pour former un polygone fermé.');
      this.cleanupDrawing();
      return;
    }

    // Créer polygone fermé avec les coords corrigées
    const polygon = new Polygon([coords]);
    polygonLayer.getSource()?.addFeature(new Feature(polygon));

    // Supprimer uniquement les lignes qui intersectent réellement ce polygone (avec Turf)
    const geojsonFormat = new GeoJSON();
    const polygonGeojson = geojsonFormat.writeFeatureObject(new Feature(polygon));

    const intersectingLines = lineLayer.getSource()?.getFeatures().filter(f => {
      const lineGeojson = geojsonFormat.writeFeatureObject(f);
      return turf.booleanIntersects(lineGeojson, polygonGeojson);
    });

    intersectingLines?.forEach(f => lineLayer.getSource()?.removeFeature(f));

    alert('Polygone créé avec succès et lignes intersectantes supprimées.');

    this.cleanupDrawing();
  });
}
  


    // startConnectingLines() {
    //   const lineLayerInfo = this.layersList.find(l => l.type === 'line');
    //   const polygonLayerInfo = this.layersList.find(l => l.type === 'polygon');

    //   if (!lineLayerInfo || !polygonLayerInfo) {
    //     alert('Les couches lignes ou polygones ne sont pas chargées.');
    //     return;
    //   }

    //   const lineLayer = lineLayerInfo.layer;
    //   const polygonLayer = polygonLayerInfo.layer;

    //   // Nettoyage des anciennes interactions
    //   if (this.drawInteraction) this.map.removeInteraction(this.drawInteraction);
    //   if (this.snapInteraction) this.map.removeInteraction(this.snapInteraction);

    //   // Source temporaire pour le dessin
    //   const tempSource = new VectorSource();

    //   // Création de l'interaction dessin (type LineString)
    //   this.drawInteraction = new Draw({
    //     source: tempSource,
    //     type: 'LineString',
    //   });
    //   // this.drawInteraction.on('drawend', this.onDrawEnd.bind(this));
    //   this.map.addInteraction(this.drawInteraction);

    //   // Snap sur couche lignes
    //   const snapLine = new Snap({
    //     source: lineLayer.getSource()!
    //   });
    //   this.map.addInteraction(snapLine);

    //   // Snap sur couche polygones
    //   const snapPolygon = new Snap({
    //     source: polygonLayer.getSource()!
    //   });
    //   this.map.addInteraction(snapPolygon);

    //   // Stocker une référence pour nettoyage plus tard (ex: snapLine)
    //   this.snapInteraction = snapLine;

    //   this.isDrawing = true;

    //   this.drawInteraction.on('drawend', (evt) => {
    //     const feature = evt.feature;
    //     const geom = feature.getGeometry() as any;
    //     let coords: Coordinate[] = geom.getCoordinates();

    //     if (coords.length < 3) {
    //       alert('Il faut au moins 3 points pour former un polygone.');
    //       this.cleanupDrawing();
    //       return;
    //     }

    //     // Fermer la ligne si non fermée
    //     const firstPoint = coords[0];
    //     const lastPoint = coords[coords.length - 1];
    //     if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
    //       coords.push(firstPoint);
    //     }

    //     // Créer le polygone et l'ajouter à la couche polygones
    //     const polygon = new Polygon([coords]);
    //     polygonLayer.getSource()?.addFeature(new Feature(polygon));

    //     // Supprimer les lignes qui intersectent vraiment ce polygone (avec Turf)
    //     const geojsonFormat = new GeoJSON();
    //     const polygonGeojson = geojsonFormat.writeFeatureObject(new Feature(polygon));

    //     const usedLineFeatures = lineLayer.getSource()?.getFeatures().filter(f => {
    //       const lineGeojson = geojsonFormat.writeFeatureObject(f);
    //       return turf.booleanIntersects(lineGeojson, polygonGeojson);
    //     });

    //     usedLineFeatures?.forEach(f => lineLayer.getSource()?.removeFeature(f));

    //     alert('Polygone créé avec succès et lignes intersectantes supprimées.');

    //     this.cleanupDrawing(); 
    //   });
    // }

    // Méthode utilitaire pour nettoyer le dessin et interactions
    cleanupDrawing() {
      if (this.drawInteraction) {
        this.map.removeInteraction(this.drawInteraction);
        this.drawInteraction = undefined!;
      }
      if (this.snapInteraction) {
        this.map.removeInteraction(this.snapInteraction);
        this.snapInteraction = undefined!;
      }
      this.isDrawing = false;
    }

    


  
     toggleDistanceMeasure() {
      this.isMeasuringDistance = !this.isMeasuringDistance;
      if (!this.isMeasuringDistance) {
        this.resetMeasure();
      } else {
        alert('Cliquez sur deux points sur la carte pour mesurer la distance.');
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
  
  
    
  
    toggleLayer(layer: string, visible: boolean) {
      // if (layer === 'osm' && this.osmLayer) {
      //   this.osmLayer.setVisible(visible);
      // }
      this.mapService.toggleLayer(layer, visible);
    }
  
  
    getCheckedValue(event: Event): boolean {
      const target = event.target as HTMLInputElement | null;
      return target?.checked ?? false;
    }
  
 
  
    toggleModalOnClick() {
      this.showModalOnClick = !this.showModalOnClick;
      alert(this.showModalOnClick ? 'Clic activé pour afficher les informations.' : 'Clic désactivé.');
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
        this.markerSource.removeFeature(this.markerFeature);
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

      // Ajouter la feature à la source dédiée
      this.markerSource.addFeature(this.markerFeature);

      this.map.getView().animate({
        center: coords,
        zoom: 14,
        duration: 800,
      });

      // 🕐 Supprimer le marker après 9 secondes
      setTimeout(() => {
        if (this.markerFeature) {
          this.markerSource.removeFeature(this.markerFeature);
          this.markerFeature = null;
        }
      }, 9000);

    } catch (error) {
      console.error('Erreur lors du traitement des coordonnées :', error);
      alert('Erreur lors de la transformation ou de l\'affichage du point.');
    }
  }




      importDXF() {
        const fileInput = document.getElementById('dxfFileInput') as HTMLInputElement;
        fileInput.click();
      }


   
    // Fonction utilitaire simple pour retirer l'extension
    removeExtension(filename: string): string {
      return filename.replace(/\.[^/.]+$/, "");
    }
    

    

 

    handleDXFFileInput(event: Event) {
      const input = event.target as HTMLInputElement;
      if (!input.files || input.files.length === 0) return;

      const file = input.files[0];
      const formData = new FormData();
      formData.append('file', file);

      this.http.post('http://127.0.0.1:8000/convert-dxf-to-shp/', formData).subscribe({
        next: (geojson: any) => {
          const rawFeatures = new GeoJSON().readFeatures(geojson, {
            dataProjection: 'EPSG:26191',
            featureProjection: 'EPSG:3857'
          });

          const expandedFeatures: Feature[] = [];

          rawFeatures.forEach(f => {
            const geom = f.getGeometry();
            if (!geom) return;

            const type = geom.getType();

            if (type === 'Point' || type === 'LineString' || type === 'Polygon') {
              expandedFeatures.push(f);
            } else if (type === 'MultiPoint') {
              const multiPoint = geom as MultiPoint;
              multiPoint.getCoordinates().forEach(coord => {
                expandedFeatures.push(
                  new Feature({
                    geometry: new Point(coord),
                    ...f.getProperties()
                  })
                );
              });
            } else if (type === 'GeometryCollection') {
              const geomCollection = geom as GeometryCollection;
              geomCollection.getGeometries().forEach(g => {
                expandedFeatures.push(
                  new Feature({
                    geometry: g,
                    ...f.getProperties()
                  })
                );
              });
            }
          });

          // 🔷 ici on filtre les couches
          const labelLayers = ['LABEL_TEXT', 'LABEL_MTEXT'];

          const labelFeatures = expandedFeatures.filter(
            f => labelLayers.includes(f.get('layer'))
          );

          const pointFeatures = expandedFeatures.filter(
            f => f.getGeometry()?.getType() === 'Point' && !labelLayers.includes(f.get('layer'))
          );

          const lineFeatures = expandedFeatures.filter(
            f => f.getGeometry()?.getType() === 'LineString'
          );

          const polygonFeatures = expandedFeatures.filter(
            f => f.getGeometry()?.getType() === 'Polygon'
          );

          const pointSource = new VectorSource({ features: pointFeatures });
          const lineSource = new VectorSource({ features: lineFeatures });
          const polygonSource = new VectorSource({ features: polygonFeatures });

          const pointLayer = new VectorLayer({
            source: pointSource,
            style: (feature) => {
              const layerName = feature.get('layer') || 'default';
              const color = this.generateColorForLayer(layerName);

              return new Style({
                image: new CircleStyle({
                  radius: 6,
                  fill: new Fill({ color }),
                  stroke: new Stroke({ color: 'white', width: 1 })
                })
              });
            },
            visible: true
          });

          const lineLayer = new VectorLayer({
            source: lineSource,
            style: new Style({
              stroke: new Stroke({ color: 'green', width: 2 })
            }),
            visible: true
          });

          const polygonLayer = new VectorLayer({
            source: polygonSource,
            style: new Style({
              stroke: new Stroke({ color: 'red', width: 2 }),
              fill: new Fill({ color: 'rgba(240, 192, 192, 0.1)' })
            }),
            visible: true
          });

          const labelLayer = new VectorLayer({
            source: new VectorSource({ features: labelFeatures }),
            style: (feature) => {
              const label = feature.get('label') || '';
              const height = feature.get('height') || 1;
              const rotation = (feature.get('rotation') || 0) * Math.PI / 180;

              const hAlignMap = ['left', 'center', 'right', 'start', 'end'];
              const vAlignMap = ['alphabetic', 'bottom', 'middle', 'top', 'hanging'];

              const hAlignIndex = feature.get('h_align') || 0;
              const vAlignIndex = feature.get('v_align') || 0;

              const textAlign = hAlignMap[hAlignIndex] || 'left';
              const textBaseline = vAlignMap[vAlignIndex] || 'alphabetic';

              const fontSize = Math.max(12, height * 5);

              let offsetX = 0;
              let offsetY = 0;

              if (textAlign === 'left') offsetX = fontSize / 2;
              else if (textAlign === 'right') offsetX = -fontSize / 2;

              if (textBaseline === 'top') offsetY = fontSize / 2;
              else if (textBaseline === 'bottom') offsetY = -fontSize / 2;

              return new Style({
                text: new Text({
                  text: label,
                  font: `${fontSize}px Calibri,sans-serif`,
                  fill: new Fill({ color: '#000' }),
                  stroke: new Stroke({ color: '#fff', width: 2 }),
                  overflow: true,
                  rotation,
                  textAlign: textAlign as CanvasTextAlign,
                  textBaseline: textBaseline as CanvasTextBaseline,
                  offsetX,
                  offsetY
                })
              });
            },
            visible: true
          });

          this.lineSource = lineSource;

          this.map.addLayer(lineLayer);
          this.map.addLayer(polygonLayer);
          this.map.addLayer(pointLayer);
          this.map.addLayer(labelLayer);

          const baseName = this.removeExtension(file.name);
          this.layersList.push(
            { name: `${baseName} - Points`, layer: pointLayer, visible: true, type: 'point' },
            { name: `${baseName} - Lignes`, layer: lineLayer, visible: true, type: 'line' },
            { name: `${baseName} - Polygones`, layer: polygonLayer, visible: true, type: 'polygon' },
            { name: `${baseName} - Labels`, layer: labelLayer, visible: true, type: 'label' }
          );

          this.layerNatureOptions.set(pointLayer, ['Poteau', 'Lampe', 'Capteur']);
          this.layerNatureOptions.set(lineLayer, ['Route', 'Clôture']);
          this.layerNatureOptions.set(polygonLayer, ['Bâtiment', 'Parcelle', 'Zone verte']);

          this.layersList.sort((a, b) => {
            const order = ['Points', 'Lignes', 'Polygones', 'Labels'];
            return order.indexOf(a.name.split(' - ')[1]) - order.indexOf(b.name.split(' - ')[1]);
          });

          const extent = expandedFeatures.length > 0
            ? new VectorSource({ features: expandedFeatures }).getExtent()
            : undefined;

          if (extent) {
            this.map.getView().fit(extent, { padding: [50, 50, 50, 50] });
          }
        },
        error: (err) => {
          console.error('Erreur lors de la conversion DXF:', err);
          alert('Erreur lors de la conversion DXF');
        }
      });
    }



  

   


    // handleDXFFileInput(event: Event) {
    //   const input = event.target as HTMLInputElement;
    //   if (!input.files || input.files.length === 0) return;

    //   const file = input.files[0];
    //   const formData = new FormData();
    //   formData.append('file', file);

    //   this.http.post('http://127.0.0.1:8000/convert-dxf-to-shp/', formData).subscribe({
    //     next: (geojson: any) => {
    //       const rawFeatures = new GeoJSON().readFeatures(geojson, {
    //         dataProjection: 'EPSG:26191',
    //         featureProjection: 'EPSG:3857'
    //       });

    //       const expandedFeatures: Feature[] = [];

    //       rawFeatures.forEach(f => {
    //         const geom = f.getGeometry();
    //         if (!geom) return;

    //         const type = geom.getType();

    //         if (type === 'Point' || type === 'LineString' || type === 'Polygon') {
    //           expandedFeatures.push(f);
    //         } else if (type === 'MultiPoint') {
    //           const multiPoint = geom as MultiPoint;
    //           multiPoint.getCoordinates().forEach(coord => {
    //             expandedFeatures.push(
    //               new Feature({
    //                 geometry: new Point(coord),
    //                 ...f.getProperties()
    //               })
    //             );
    //           });
    //         } else if (type === 'GeometryCollection') {
    //           const geomCollection = geom as GeometryCollection;
    //           geomCollection.getGeometries().forEach(g => {
    //             expandedFeatures.push(
    //               new Feature({
    //                 geometry: g,
    //                 ...f.getProperties()
    //               })
    //             );
    //           });
    //         }
    //       });

    //       const labelFeatures = expandedFeatures.filter(f => f.get('layer') === 'LABELS_TEXT');
    //       const pointFeatures = expandedFeatures.filter(f => f.getGeometry()?.getType() === 'Point' && f.get('layer') !== 'LABELS_TEXT');
    //       const lineFeatures = expandedFeatures.filter(f => f.getGeometry()?.getType() === 'LineString');
    //       const polygonFeatures = expandedFeatures.filter(f => f.getGeometry()?.getType() === 'Polygon');

    //       const pointSource = new VectorSource({ features: pointFeatures });
    //       const lineSource = new VectorSource({ features: lineFeatures });
    //       const polygonSource = new VectorSource({ features: polygonFeatures });

    //       // const pointLayer = new VectorLayer({
    //       //   source: pointSource,
    //       //   style: new Style({
    //       //     image: new CircleStyle({
    //       //       radius: 5,
    //       //       fill: new Fill({ color: 'blue' }),
    //       //       stroke: new Stroke({ color: 'white', width: 1 })
    //       //     })
    //       //   }),
    //       //   visible: true
    //       // });
    //       const pointLayer = new VectorLayer({
    //         source: pointSource,
    //         style: (feature) => {
    //           const layerName = feature.get('layer') || 'default';
    //           const color = this.generateColorForLayer(layerName);

    //           return new Style({
    //             image: new CircleStyle({
    //               radius: 6,
    //               fill: new Fill({ color }),
    //               stroke: new Stroke({ color: 'white', width: 1 })
    //             })
    //           });
    //         },
    //         visible: true
    //       });


    //       const lineLayer = new VectorLayer({
    //         source: lineSource,
    //         style: new Style({
    //           stroke: new Stroke({ color: 'green', width: 2 })
    //         }),
    //         visible: true
    //       });

    //       const polygonLayer = new VectorLayer({
    //         source: polygonSource,
    //         style: new Style({
    //           stroke: new Stroke({ color: 'red', width: 2 }),
    //           fill: new Fill({ color: 'rgba(235, 161, 161, 0.1)' })
    //         }),
    //         visible: true
    //       });

    //       const labelLayer = new VectorLayer({
    //         source: new VectorSource({ features: labelFeatures }),
    //         style: (feature) => {
    //           const label = feature.get('label') || '';
    //           return new Style({
    //             text: new Text({
    //               text: label,
    //               font: '14px Calibri,sans-serif',
    //               fill: new Fill({ color: '#000' }),
    //               stroke: new Stroke({ color: '#fff', width: 2 }),
    //               overflow: true,
    //               offsetY: -10
    //             })
    //           });
    //         },
    //         visible: true
    //       });
    //       this.lineSource = lineSource; 
    //       this.map.addLayer(lineLayer);
    //       this.map.addLayer(polygonLayer);
          
    //       this.map.addLayer(pointLayer);
    //       this.map.addLayer(labelLayer);

    //       const baseName = this.removeExtension(file.name);
    //       this.layersList.push(
    //         { name: `${baseName} - Points`, layer: pointLayer, visible: true, type: 'point' },
    //         { name: `${baseName} - Lignes`, layer: lineLayer, visible: true, type: 'line' },
    //         { name: `${baseName} - Polygones`, layer: polygonLayer, visible: true, type: 'polygon' },
    //         { name: `${baseName} - Labels`, layer: labelLayer, visible: true, type: 'label' }
    //       );

    //       this.layerNatureOptions.set(pointLayer, ['Poteau', 'Lampe', 'Capteur']);
    //       this.layerNatureOptions.set(lineLayer, ['Route', 'Clôture']);
    //       this.layerNatureOptions.set(polygonLayer, ['Bâtiment', 'Parcelle', 'Zone verte']);

    //       this.layersList.sort((a, b) => {
    //         const order = ['Points', 'Lignes', 'Polygones', 'Labels'];
    //         return order.indexOf(a.name.split(' - ')[1]) - order.indexOf(b.name.split(' - ')[1]);
    //       });

    //       const extent = expandedFeatures.length > 0 
    //         ? new VectorSource({ features: expandedFeatures }).getExtent() 
    //         : undefined;

    //       if (extent) {
    //         this.map.getView().fit(extent, { padding: [50, 50, 50, 50] });
    //       }
    //     },
    //     error: (err) => {
    //       console.error('Erreur lors de la conversion DXF:', err);
    //       alert('Erreur lors de la conversion DXF');
    //     }
    //   });
    // }



    generateColorForLayer(layer: string): string {
      if (this.layerColorMap[layer]) {
        return this.layerColorMap[layer];
      }

      // Génère une couleur HSL aléatoire
      const hue = Math.floor(Math.random() * 360);
      const color = `hsl(${hue}, 70%, 50%)`;

      this.layerColorMap[layer] = color;
      return color;
    }


      toggleLayerVisibility(layerInfo: { name: string, layer: VectorLayer, visible: boolean }) {
        layerInfo.visible = !layerInfo.visible;
        layerInfo.layer.setVisible(layerInfo.visible);
      }

      

  

  

      enableEditing(layer: VectorLayer) {
        if (this.modifyInteraction) {
          this.map.removeInteraction(this.modifyInteraction);
        }

        this.selectedLayerForModify = layer;
        this.activeEditableLayer = layer;

        this.modifyInteraction = new Modify({
          source: layer.getSource() as VectorSource,
          pixelTolerance: 0,
        });

        this.map.addInteraction(this.modifyInteraction);

        this.map.on('singleclick', this.onMapClickDelete);
      }

      toggleEditing(layer: VectorLayer) {
        // Si on clique sur la même couche = désactiver
        if (this.editingLayer === layer) {
          this.disableEditing(); // ↩️ on désactive tout
        } else {
          this.disableEditing(); // 🔁 d'abord désactiver toute édition en cours

          // this.selectedLayerForModify = layer;
          this.editingLayer = layer;

          this.modifyInteraction = new Modify({
            source: layer.getSource() as VectorSource,
            pixelTolerance: 0,
          });

          this.map.addInteraction(this.modifyInteraction);
          // this.map.on('singleclick', this.onMapClickDelete);
        }
      }





      onMapClickDelete = (evt: any) => {
        if (!this.selectedLayerForModify) return;

        // Récupérer la ou les entités sous le clic
        const clickedFeatures: Feature[] = [];

        this.map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
          if (layer === this.selectedLayerForModify) {
            clickedFeatures.push(feature as Feature);
          }
        });

        // ✅ Si sélection multiple active (des entités déjà sélectionnées)
        if (this.selectedFeatures?.getLength?.() > 0) {
          const confirmDelete = confirm(`Supprimer ${this.selectedFeatures.getLength()} entité(s) sélectionnée(s) ?`);
          if (confirmDelete) {
            const source = this.selectedLayerForModify.getSource();
            this.selectedFeatures.forEach(f => source?.removeFeature(f));
            this.selectedFeatures.clear();
          }
          return;
        }

        // ✅ Sinon suppression simple
        if (clickedFeatures.length > 0) {
          const confirmDelete = confirm('Voulez-vous supprimer cet objet ?');
          if (confirmDelete) {
            const source = this.selectedLayerForModify.getSource();
            clickedFeatures.forEach(f => source?.removeFeature(f));
          }
        }
      };


      disableEditing() {
        if (this.modifyInteraction) {
          this.map.removeInteraction(this.modifyInteraction);
          this.modifyInteractionn = undefined;
          
        }
        if (this.selectInteraction) {
          this.map.removeInteraction(this.selectInteraction);
          this.selectInteraction = null;
        }
        if (this.dragBoxInteraction) {
          this.map.removeInteraction(this.dragBoxInteraction);
          this.dragBoxInteraction = null;
        }
              
        this.selectedLayerForModify = null;
        this.editingLayer = null;
        this.classificationLayer = null;
        this.classificationActive = false;
        this.selectedFeatures?.clear();

        this.map.un('singleclick', this.onMapClickDelete);
        this.map.un('singleclick', this.classificationHandler);

        if (this.keydownHandler) {
          window.removeEventListener('keydown', this.keydownHandler);
          this.keydownHandler = null;
        }
      }

   

      enableMultiSelect(layer: VectorLayer) {
        this.disableEditing(); // désactive l'édition active

        this.selectedLayerForModify = layer;

        // 🔁 Supprimer ancienne interaction de sélection
        if (this.selectInteraction) {
          this.map.removeInteraction(this.selectInteraction);
        }
        

        this.selectedFeatures = new Collection<Feature>();

        // 🖱️ Sélection par clic (sans Ctrl)
        this.selectInteraction = new Select({
          layers: [layer],
          condition: click,
          toggleCondition: () => false, // pas de toggle
          multi: true,
          features: this.selectedFeatures,
        });

        this.map.addInteraction(this.selectInteraction);

        // 📦 Activer la sélection par glissement (box)
        const dragBox = new DragBox();

        dragBox.on('boxend', () => {
          const extent = dragBox.getGeometry().getExtent();
          const source = layer.getSource();
          if (source) {
            source.forEachFeatureIntersectingExtent(extent, (feature) => {
              if (!this.selectedFeatures.getArray().includes(feature)) {
                this.selectedFeatures.push(feature);
              }
            });
          }
          console.log('Sélection après glissement :', this.selectedFeatures.getLength());
        });

        dragBox.on('boxstart', () => {
          // Ne vide pas la sélection → cumulatif
          // Si tu veux vider avant chaque glissement : décommente cette ligne
          // this.selectedFeatures.clear();
        });

        this.map.addInteraction(dragBox);

        // 📌 Enregistrer aussi pour nettoyage
        this.dragBoxInteraction = dragBox;

        // 🧠 Sélection cumulative manuelle
        this.selectInteraction.on('select', (e) => {
          e.selected.forEach((f) => {
            if (!this.selectedFeatures.getArray().includes(f)) {
              this.selectedFeatures.push(f);
            }
          });

          e.deselected.forEach((f) => {
            // Optionnel : ne pas retirer, car on veut sélection cumulative
            if (!this.selectedFeatures.getArray().includes(f)) {
              this.selectedFeatures.push(f);
            }
          });

          console.log('Sélection actuelle (clic + glissement) :', this.selectedFeatures.getLength());
        });
      }



     

      deleteSelectedFeatures() {
        if (!this.selectedLayerForModify || !this.selectInteraction) return;

        const source = this.selectedLayerForModify.getSource();
        const featuresToDelete = [...this.selectedFeatures.getArray()]; // copie sécurisée
        const count = featuresToDelete.length;

        if (count === 0) {
          alert("Aucune entité sélectionnée.");
          return;
        }

        const confirmDelete = confirm(`Supprimer ${count} entité(s) sélectionnée(s) ?`);
        if (confirmDelete) {
          featuresToDelete.forEach(f => source?.removeFeature(f));
          this.selectedFeatures.clear();

          // Affiche l'alerte après un court délai
          setTimeout(() => {
            alert(`${count} entité(s) supprimée(s) avec succès.`);
          }, 100);
        }
      }
 

      // disableSelection() {
      //   if (this.selectInteraction) {
      //     this.map.removeInteraction(this.selectInteraction);
      //     this.selectInteraction = null;
      //     this.dragBoxInteraction = null;
      //     this.selectedFeatures.clear();
      //   }
      //   this.selectedLayerForModify = null;
      // }
      getLayerName(layer: VectorLayer): string {
        const found = this.layersList.find(l => l.layer === layer);
        return found?.name ?? 'Couche inconnue';
      }

      enableSelection(layer: VectorLayer) {
        if (this.selectInteraction) {
          this.map.removeInteraction(this.selectInteraction);
        }

        this.selectInteraction = new Select({
          layers: [layer],
          condition: click,
          multi: true
        });

        this.selectInteraction.on('select', (e) => {
          this.selectedFeatures = e.target.getFeatures().getArray();
          this.sourceLayerForMove = layer;
          console.log('Sélection actuelle :', this.selectedFeatures.getLength());
        });

        this.map.addInteraction(this.selectInteraction);
        alert(`Mode de sélection activé pour la couche : ${this.getLayerName(layer)}`);
      }

      moveSelectedFeaturesTo(targetLayer: VectorLayer) {
        if (!this.sourceLayerForMove || !this.selectedFeatures.getLength()) {
          alert('Veuillez d’abord sélectionner des entités.');
          return;
        }

        if (targetLayer === this.sourceLayerForMove) {
          alert('La couche cible est identique à la couche source.');
          return;
        }

        const source = this.sourceLayerForMove.getSource();
        const target = targetLayer.getSource();

        this.selectedFeatures.forEach(f => {
          source?.removeFeature(f);
          target?.addFeature(f);
        });

        this.selectedFeatures.clear();
        this.sourceLayerForMove = null;

        if (this.selectInteraction) {
          this.map.removeInteraction(this.selectInteraction);
          this.selectInteraction = null;
        }

        alert('Entités déplacées avec succès 🎉');
      }




    @HostListener('window:keydown', ['$event'])
    handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Delete' || event.key === 'Del') {
        if (!this.selectedLayerForModify) return;

        const featuresToDelete = [...this.selectedFeatures.getArray()];
        // if (featuresToDelete.length === 0) {
        //   alert("Aucune entité sélectionnée.");
        //   return;
        // }

        const confirmDelete = confirm(`Supprimer ${featuresToDelete.length} entité(s) sélectionnée(s) ?`);
        if (confirmDelete) {
          const source = this.selectedLayerForModify.getSource();
          featuresToDelete.forEach(f => source?.removeFeature(f));
          this.selectedFeatures.clear();
          alert(`${featuresToDelete.length} entité(s) supprimée(s) avec succès.`);
        }
      }
     
    }






      enableDeleteMode(layer: VectorLayer) { 
        if (this.editingLayer !== layer) {
          alert("Veuillez activer le mode Édition d'abord.");
          return;
        }

        // Désactiver la classification si active
        if (this.classificationActive) {
          this.map.un('singleclick', this.classificationHandler);
          this.classificationLayer = null;
          this.classificationActive = false;
        }

        this.selectedLayerForModify = layer;

        // Supprimer ancienne interaction de sélection si elle existe
        if (this.selectInteraction) {
          this.map.removeInteraction(this.selectInteraction);
        }

        this.selectedFeatures = new Collection<Feature>();

        // Sélection multiple sans Ctrl
        this.selectInteraction = new Select({
          layers: [layer],
          condition: click,
          toggleCondition: () => false,
          multi: true,
          features: this.selectedFeatures,
        });
        this.map.addInteraction(this.selectInteraction);

        // DragBox pour sélectionner par glissement
        const dragBox = new DragBox({ condition: () => true });

        dragBox.on('boxend', () => {
          const extent = dragBox.getGeometry().getExtent();
          layer.getSource()?.forEachFeatureIntersectingExtent(extent, (feature) => {
            if (!this.selectedFeatures.getArray().includes(feature)) {
              this.selectedFeatures.push(feature);
            }
          });
        });

        dragBox.on('boxstart', () => {
          this.selectedFeatures.clear();
        });

        this.map.addInteraction(dragBox);

        // Activer la suppression au clic
        this.map.un('singleclick', this.onMapClickDelete);
        this.map.on('singleclick', (evt) => {
          if (!this.selectedLayerForModify) return;

          const featuresToDelete: Feature[] = [];

          this.map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
            if (layer === this.selectedLayerForModify) {
              featuresToDelete.push(feature as Feature);
            }
          });

          if (featuresToDelete.length > 0) {
            const confirmDelete = confirm(`Voulez-vous supprimer ${featuresToDelete.length} entité(s) ?`);
            if (confirmDelete) {
              const source = this.selectedLayerForModify.getSource();
              featuresToDelete.forEach(f => source?.removeFeature(f));
              // Retirer aussi de la sélection
              featuresToDelete.forEach(f => {
                const idx = this.selectedFeatures.getArray().indexOf(f);
                if (idx > -1) this.selectedFeatures.removeAt(idx);
              });
              alert(`${featuresToDelete.length} entité(s) supprimée(s) avec succès.`);
            }
          }
        });

        

        this.keydownHandler = (event: KeyboardEvent) => {
          if (event.key === 'Delete' || event.key === 'Del') {
            if (!this.selectedLayerForModify) return;

            const featuresToDelete = [...this.selectedFeatures.getArray()];
            if (featuresToDelete.length === 0) {
              alert("Aucune entité sélectionnée.");
              return;
            }

            const confirmDelete = confirm(`Supprimer ${featuresToDelete.length} entité(s) sélectionnée(s) ?`);
            if (confirmDelete) {
              const source = this.selectedLayerForModify.getSource();
              featuresToDelete.forEach(f => {
                source?.removeFeature(f);
                this.selectedFeatures.remove(f); // retirer aussi de la sélection
              });
              alert(`${featuresToDelete.length} entité(s) supprimée(s) avec succès.`);
            }
          }
        };

        // window.addEventListener('keydown', this.keydownHandler);

        alert("Mode suppression activé.\nCliquez ou glissez pour sélectionner des entités.\nAppuyez sur la touche 'Suppr' pour supprimer.");
      }



      enableClassification(layer: VectorLayer) {
        // 🔁 Si déjà activé → on désactive
        if (this.classificationLayer === layer && this.classificationActive) {
          this.map.un('singleclick', this.classificationHandler);
          this.classificationLayer = null;
          this.classificationActive = false;
          alert("Mode classification désactivé.");
          return;
        }

        // ✅ Désactiver la suppression si active
        this.map.un('singleclick', this.onMapClickDelete);
        this.selectedLayerForModify = null;

        // 🔘 Activer la classification
        this.classificationLayer = layer;
        this.classificationActive = true;

        this.map.un('singleclick', this.classificationHandler); // sécurité
        this.map.on('singleclick', this.classificationHandler);

        alert("Mode classification activé. Cliquez sur un objet pour définir sa nature.");
      }


      // classificationHandler = (evt: any) => {
      //   if (!this.classificationLayer) return;

      //   const rawFeature = this.map.forEachFeatureAtPixel(evt.pixel, (feat, layer) => {
      //     return layer === this.classificationLayer ? feat : null;
      //   });

      //   const feature = rawFeature as Feature; // 👈 Caster explicitement

      //   if (feature) {
      //     let currentNature = feature.get('nature') || '';

 
      //     const natureOptions = this.layerNatureOptions.get(this.classificationLayer) || [];

  

      //     const layerType = this.layersList.find(l => l.layer === this.classificationLayer)?.type || '';

      //     const dialogRef = this.dialog.open(NatureDialogComponent, {
      //       width: '400px',
      //       data: {
      //         current: currentNature,
      //         options: natureOptions,
      //         type: layerType // ✅ transmettre "polygon", "line", etc.
      //       }
      //     });

      //     dialogRef.afterClosed().subscribe((result: any) => {
      //       if (result) {
      //         if (typeof result === 'string') {
      //           feature.set('nature', result);
      //           alert(`Nature définie : ${result}`);    
      //         } else {
      //           feature.set('nature', result.nature);
      //           feature.set('consistance', result.consistance);
      //           alert(`Nature : ${result.nature} | Consistance : ${result.consistance}`);
      //         }
      //       }
      //     });

          


          
      //   }
      // };
    



      classificationHandler = (evt: any) => {
        if (!this.classificationLayer) return;

        const rawFeature = this.map.forEachFeatureAtPixel(evt.pixel, (feat, layer) => {
          return layer === this.classificationLayer ? feat : null;
        });

        const feature = rawFeature as Feature;

        if (feature) {
          const currentNature = feature.get('nature') || '';
          const currentConsistances =
            feature.get('consistances') as { type: string; nb_consistance: number }[] || [];

          const natureOptions = this.layerNatureOptions.get(this.classificationLayer) || [];
          const layerType = this.layersList.find(l => l.layer === this.classificationLayer)?.type || '';

          // Si déjà défini → afficher infos
          if (currentNature || currentConsistances.length > 0) {
            let message = `🌳 Nature : ${currentNature || 'Non définie'}\n`;

            if (currentConsistances.length > 0) {
              message += '🏗️ Consistances :\n';
              message += currentConsistances
                .map((c: { type: string; nb_consistance: number }) => ` - ${c.type} : ${c.nb_consistance}`)
                .join('\n');
            } else {
              message += 'Aucune consistance enregistrée.';
            }

            alert(message);
            return; // on ne continue pas
          }

          // Sinon → ouvrir le modal pour saisir
          const dialogRef = this.dialog.open(NatureDialogComponent, {
            width: '400px',
            data: {
              current: currentNature,
              options: natureOptions,
              type: layerType
            }
          });

          dialogRef.afterClosed().subscribe((result: any) => {
            if (result) {
              if (typeof result === 'string') {
                feature.set('nature', result);
                alert(`Nature définie : ${result}`);
              } else {
                feature.set('nature', result.nature);
                feature.set('consistances', result.consistances);

                const consSummary = result.consistances
                  .map((c: { type: string; nb_consistance: number }) => `${c.type}: ${c.nb_consistance}`)
                  .join(' | ');

                alert(`✅ Nature définie : ${result.nature} | Consistances : ${consSummary}`);
              }
            }
          });
        }
      };

      getFeaturesFromLayer(layer: VectorLayer<VectorSource>): Feature[] {
        const source = layer.getSource();
        if (!source) return [];
        return source.getFeatures();
      }
      getFeaturesByType(type: string): Feature[] {
        return this.layersList
          .filter(l => l.type === type && l.visible)
          .flatMap(l => this.getFeaturesFromLayer(l.layer));
      }

      featureToGeoJSON(feature: Feature): any {
        const geojson = new GeoJSON().writeFeatureObject(feature);
        if (!geojson.properties) geojson.properties = {};
        if (!geojson.type) geojson.type = 'Feature';
        if (!geojson.geometry || !geojson.geometry.type || !(geojson.geometry as any).coordinates) {
          throw new Error('Feature sans géométrie valide');
        }

        return geojson;
      }


      saveLayer(layer: any) {
        const affaireId = this.affaireService.getAffaireId();
        const payload = {
          affaire_id: affaireId,
          layer_name: layer.name,
          geometry_type: layer.type, // 'point' | 'line' | 'polygon'
          features: {
            type: 'FeatureCollection',
            features: layer.features
          }
        };

        this.http.post('http://127.0.0.1:8000/save/', payload).subscribe({
          next: (res: any) => {
              alert(res.message);
          },
          error: (err) => {
            console.error(err);
            alert('❌ Erreur lors de l’enregistrement');
          }
        });
      }



}

