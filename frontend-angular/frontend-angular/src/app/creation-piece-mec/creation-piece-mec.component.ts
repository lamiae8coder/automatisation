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
import OlMap from 'ol/Map'; 
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
import { LayersService } from '../services/layers.service';
import { SocieteService } from '../services/societe.service';
import { Observable } from 'rxjs';
import { Pixel } from 'ol/pixel';


@Component({
  selector: 'app-creation-piece-mec',
  standalone: false,
  templateUrl: './creation-piece-mec.component.html',
  styleUrl: './creation-piece-mec.component.css'
})
export class CreationPieceMecComponent implements AfterViewInit{

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
    imageOverlays: Overlay[] = [];
    private dragBoxInteraction: DragBox | null = null;
    private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
    undoStack: any[] = [];
    trimmedLineSource!: VectorSource;
    trimmedLineLayer!: VectorLayer;
    lineSource!: VectorSource;
    shapefileLayers: { layer: VectorLayer, name: string, visible: boolean }[] = [];
    // shapefileLayers!: Observable<any[]>;

    constructor(private http: HttpClient,public societeService : SocieteService , public layersService: LayersService,private affaireService: AffaireService,private mapService: MapService, private dialog: MatDialog) {
      
    }
  
    
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
    // this.shapefileLayers = this.layersService.shapefileLayers$;
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
    this.mapService.shapefileLayers$.subscribe(layers => {
      this.shapefileLayers = layers;
    });
    this.layersService.layersList$.subscribe(layers => {
      this.layersList = layers;
    });
  }


  

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
      this.mapService.toggleLayer(layer, visible);
    }
  
  
    getCheckedValue(event: Event): boolean {
      const target = event.target as HTMLInputElement | null;
      return target?.checked ?? false;
    }

    toggleSpecificLayer(index: number, visible: boolean) {
      this.mapService.updateShapefileVisibility(index, visible);
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
      importFeuilletDXF() {
        const fileInput = document.getElementById('dxfFileInputFeuille') as HTMLInputElement;
        fileInput.click();
      }


   
    // Fonction utilitaire simple pour retirer l'extension
    removeExtension(filename: string): string {
      return filename.replace(/\.[^/.]+$/, "");
    }
    

    

// handleDXFFileInput_mec(event: Event) {
//   const input = event.target as HTMLInputElement;
//   if (!input.files || input.files.length === 0) return;

//   const file = input.files[0];
//   const baseName = this.removeExtension(file.name);

//   // Nettoyage des anciennes couches
//   const currentLayers = this.layersService.layersList;
//   currentLayers.forEach(l => {
//     if (l.name.startsWith(baseName)) {
//       this.map.removeLayer(l.layer);
//     }
//   });
//   this.layersService.layersList = currentLayers.filter(l => !l.name.startsWith(baseName));

//   // Nettoyage des overlays (au cas où)
//   document.querySelectorAll('.ol-image-overlay').forEach(el => el.remove());
//   this.map.getOverlays().getArray()
//     .filter(o => o.getElement()?.classList.contains('ol-image-overlay'))
//     .forEach(o => this.map.removeOverlay(o));

//   // Préparation requête backend
//   const formData = new FormData();
//   formData.append('file', file);
  
//   const affaireId = this.affaireService.getAffaireId();
//   if (!affaireId) {
//     console.error("Aucune affaire sélectionnée !");
//     return;
//   }
//   const IGT = this.societeService.getInfo().numeroIGT
//   const ville = this.societeService.getInfo().ville
//   formData.append('affaire_id', affaireId.toString());
//   formData.append('IGT', IGT);
//   formData.append('ville', ville);
//   const backendUrl = 'http://127.0.0.1:8000';

//   this.http.post(`${backendUrl}/convert-dxf-to-shp-mec/`, formData).subscribe({
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
//           (geom as MultiPoint).getCoordinates().forEach(coord => {
//             expandedFeatures.push(new Feature({
//               geometry: new Point(coord),
//               ...f.getProperties()
//             }));
//           });
//         } else if (type === 'GeometryCollection') {
//           (geom as GeometryCollection).getGeometries().forEach(g => {
//             expandedFeatures.push(new Feature({
//               geometry: g,
//               ...f.getProperties()
//             }));
//           });
//         }
//       });

//       const labelLayers = ['LABEL_TEXT', 'LABEL_MTEXT'];
//       const labelFeatures = expandedFeatures.filter(f => labelLayers.includes(f.get('layer')));
//       const featuresWithImages = labelFeatures.filter(f => {
//         const images = f.get('images');
//         return images && Array.isArray(images) && images.length > 0;
//       });

//       const labelImageFeatures: Feature[] = [];
//       featuresWithImages.forEach(feature => {
//         const images: string[] = feature.get('images');
//         if (!images) return;
//         const baseCoord = (feature.getGeometry() as Point).getCoordinates();

//         images.forEach((imageUrl, index) => {
//           const coord = [baseCoord[0], baseCoord[1] - index * 80];
//           labelImageFeatures.push(new Feature({
//             geometry: new Point(coord),
//             image_url: imageUrl,
//             image_id: feature.get('image_id') ? `${feature.get('image_id')}_${index}` : undefined,
//             original_label_id: feature.getId() || undefined,
//           }));
//         });
//       });

//       const rawImageFeatures = expandedFeatures.filter(f => f.get('layer') === 'IMAGE');
//       const imageFeatures: Feature[] = [];
//       rawImageFeatures.forEach((feature, index) => {
//         const geometry = feature.getGeometry();
//         if (!geometry || geometry.getType() !== 'Point') return;

//         const coord = (geometry as Point).getCoordinates();
//         const offsetCoord = [coord[0], coord[1] - index * 80];

//         const newFeature = new Feature({
//           geometry: new Point(offsetCoord),
//           image_url: feature.get('image_url') || feature.get('image') || '',
//           image_id: feature.get('image_id') || `image_${index}`,
//           original_label_id: feature.getId() || undefined,
//         });

//         imageFeatures.push(newFeature);
//       });

//       const allImageFeatures = [...labelImageFeatures, ...imageFeatures];

//       const imageSource = new VectorSource({ features: allImageFeatures });

//       const imageLayer = new VectorLayer({
//         source: imageSource,
//         style: (feature) => {
//           const imageUrl = feature.get('image_url');
//           if (!imageUrl) return;
//           const fullUrl = imageUrl.startsWith('http') ? imageUrl : backendUrl + imageUrl;
//           return new Style({
//             image: new Icon({
//               src: fullUrl,
//               scale: 0.2,
//               anchor: [0.5, 1]
//             })
//           });
//         },
//         visible: true,
//       });

//       this.map.addLayer(imageLayer);

//       if (this.modifyInteraction) {
//         this.map.removeInteraction(this.modifyInteraction);
//       }

//       this.modifyInteraction = new Modify({ source: imageSource });
//       this.map.addInteraction(this.modifyInteraction);

//       this.modifyInteraction.on('modifyend', evt => {
//         evt.features.forEach(feature => {
//           const geom = feature.getGeometry();
//           if (geom && geom.getType() === 'Point') {
//             const coords = (geom as Point).getCoordinates();
//             console.log('Image déplacée à:', coords);
//           }
//         });
//       });

//       const pointFeatures = expandedFeatures.filter(f =>
//         f.getGeometry()?.getType() === 'Point' && !labelLayers.includes(f.get('layer')) && f.get('layer') !== 'IMAGE'
//       );
//       const lineFeatures = expandedFeatures.filter(f => f.getGeometry()?.getType() === 'LineString');
//       const polygonFeatures = expandedFeatures.filter(f => f.getGeometry()?.getType() === 'Polygon');

//       const pointSource = new VectorSource({ features: pointFeatures });
//       const lineSource = new VectorSource({ features: lineFeatures });
//       const polygonSource = new VectorSource({ features: polygonFeatures });
//       const labelSource = new VectorSource({ features: labelFeatures });

//       const pointLayer = new VectorLayer({
//         source: pointSource,
//         style: feature => {
//           const layerName = feature.get('layer') || 'default';
//           const color = this.generateColorForLayer(layerName);
//           return new Style({
//             image: new CircleStyle({
//               radius: 6,
//               fill: new Fill({ color }),
//               stroke: new Stroke({ color: 'white', width: 1 }),
//             }),
//           });
//         },
//         visible: true,
//       });

//       const lineLayer = new VectorLayer({
//         source: lineSource,
//         style: new Style({
//           stroke: new Stroke({ color: 'green', width: 2 }),
//         }),
//         visible: true,
//       });

//       const polygonLayer = new VectorLayer({
//         source: polygonSource,
//         style: new Style({
//           stroke: new Stroke({ color: 'red', width: 2 }),
//           fill: new Fill({ color: 'rgba(240, 192, 192, 0.1)' }),
//         }),
//         visible: true,
//       });

//       const labelLayer = new VectorLayer({
//         source: labelSource,
//         style: feature => {
//           const label = feature.get('label') || '';
//           const height = feature.get('height') || 1;
//           const rotation = (feature.get('rotation') || 0) * Math.PI / 180;

//           const hAlignMap = ['left', 'center', 'right'];
//           const vAlignMap = ['alphabetic', 'bottom', 'middle', 'top', 'hanging'];

//           const textAlign = hAlignMap[feature.get('h_align')] || 'left';
//           const textBaseline = vAlignMap[feature.get('v_align')] || 'alphabetic';

//           const fontSize = Math.max(12, height * 5);

//           return new Style({
//             text: new Text({
//               text: label,
//               font: `${fontSize}px Calibri,sans-serif`,
//               fill: new Fill({ color: '#000' }),
//               stroke: new Stroke({ color: '#fff', width: 2 }),
//               overflow: true,
//               rotation,
//               textAlign: textAlign as CanvasTextAlign,
//               textBaseline: textBaseline as CanvasTextBaseline,
//             }),
//           });
//         },
//         visible: true,
//       });

//       this.map.addLayer(pointLayer);
//       this.map.addLayer(lineLayer);
//       this.map.addLayer(polygonLayer);
//       this.map.addLayer(labelLayer);

//       this.layersService.addLayer({ name: `${baseName} - Points`, layer: pointLayer, visible: true, type: 'point' });
//       this.layersService.addLayer({ name: `${baseName} - Lignes`, layer: lineLayer, visible: true, type: 'line' });
//       this.layersService.addLayer({ name: `${baseName} - Polygones`, layer: polygonLayer, visible: true, type: 'polygon' });
//       this.layersService.addLayer({ name: `${baseName} - Labels`, layer: labelLayer, visible: true, type: 'label' });
//       this.layersService.addLayer({ name: `${baseName} - Images`, layer: imageLayer, visible: true, type: 'image' });

//       this.layerNatureOptions.set(pointLayer, ['Poteau', 'Lampe', 'Capteur']);
//       this.layerNatureOptions.set(lineLayer, ['Route', 'Clôture']);
//       this.layerNatureOptions.set(polygonLayer, ['Bâtiment', 'Parcelle', 'Zone verte']);

//       this.layersList = this.layersService.layersList.slice();
//       this.layersList.sort((a, b) => {
//         const order = ['Points', 'Lignes', 'Polygones', 'Labels', 'Images'];
//         return order.indexOf(a.name.split(' - ')[1]) - order.indexOf(b.name.split(' - ')[1]);
//       });

//       if (expandedFeatures.length > 0) {
//         const extent = new VectorSource({ features: expandedFeatures }).getExtent();
//         this.map.getView().fit(extent, { padding: [50, 50, 50, 50] });
//       }
//     },
//     error: (err) => {
//       console.error('Erreur lors de la conversion DXF:', err);
//       alert('Erreur lors de la conversion DXF');
//     }
//   });
// }


handleDXFFileInput_mec_direct_montage() {
  const formData = new FormData();

  const affaireId = this.affaireService.getAffaireId();
  if (!affaireId) {
    console.error("Aucune affaire sélectionnée !");
    return;
  }

  const IGT = this.societeService.getInfo().numeroIGT;
  const ville = this.societeService.getInfo().ville;

  formData.append('affaire_id', affaireId.toString());
  formData.append('IGT', IGT);
  formData.append('ville', ville);
  const adresse = this.societeService.getInfo().adresse
  formData.append('adresse', adresse);
  const tele = this.societeService.getInfo().tele
  formData.append('tele', tele);
  const email = this.societeService.getInfo().email
  formData.append('email', email);
  const backendUrl = 'http://127.0.0.1:8000';

  this.http.post(`${backendUrl}/convert-dxf-to-shp-mec-direct-montage/`, formData, {
    responseType: 'blob' // 👈 Très important : on attend un PDF
  }).subscribe({
    next: (blob: Blob) => {
      console.log('✅ PDF reçu du backend');

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().split('T')[0];
      a.download = `MEC_${affaireId}_${today}.pdf`; // nom du fichier
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    error: (err) => {
      console.error('❌ Erreur lors de la génération du PDF:', err);
      alert('Erreur lors de la génération du fichier PDF');
    }
  });
}





handleDXFFileInput_mec_direct() {
  const formData = new FormData();

  const affaireId = this.affaireService.getAffaireId();
  if (!affaireId) {
    console.error("Aucune affaire sélectionnée !");
    return;
  }

  const IGT = this.societeService.getInfo().numeroIGT;
  const ville = this.societeService.getInfo().ville;

  formData.append('affaire_id', affaireId.toString());
  formData.append('IGT', IGT);
  formData.append('ville', ville);

  const backendUrl = 'http://127.0.0.1:8000';

  this.http.post(`${backendUrl}/convert-dxf-to-shp-mec-direct/`, formData, {
    responseType: 'blob' // 👈 Très important : on attend un PDF
  }).subscribe({
    next: (blob: Blob) => {
      console.log('✅ PDF reçu du backend');

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().split('T')[0];
      a.download = `MEC_${affaireId}_${today}.pdf`; // nom du fichier
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    error: (err) => {
      console.error('❌ Erreur lors de la génération du PDF:', err);
      alert('Erreur lors de la génération du fichier PDF');
    }
  });
}




// handleDXFFileInput_mec_direct() {

//   // Préparation requête backend
//   const formData = new FormData();
  
//   const affaireId = this.affaireService.getAffaireId();
//   if (!affaireId) {
//     console.error("Aucune affaire sélectionnée !");
//     return;
//   }
//   const IGT = this.societeService.getInfo().numeroIGT
//   const ville = this.societeService.getInfo().ville
//   formData.append('affaire_id', affaireId.toString());
//   formData.append('IGT', IGT);
//   formData.append('ville', ville);
//   const backendUrl = 'http://127.0.0.1:8000';

//   this.http.post(`${backendUrl}/convert-dxf-to-shp-mec-direct/`, formData).subscribe({
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
//           (geom as MultiPoint).getCoordinates().forEach(coord => {
//             expandedFeatures.push(new Feature({
//               geometry: new Point(coord),
//               ...f.getProperties()
//             }));
//           });
//         } else if (type === 'GeometryCollection') {
//           (geom as GeometryCollection).getGeometries().forEach(g => {
//             expandedFeatures.push(new Feature({
//               geometry: g,
//               ...f.getProperties()
//             }));
//           });
//         }
//       });

//       const labelLayers = ['LABEL_TEXT', 'LABEL_MTEXT'];
//       const labelFeatures = expandedFeatures.filter(f => labelLayers.includes(f.get('layer')));
//       const featuresWithImages = labelFeatures.filter(f => {
//         const images = f.get('images');
//         return images && Array.isArray(images) && images.length > 0;
//       });

//       const labelImageFeatures: Feature[] = [];
//       featuresWithImages.forEach(feature => {
//         const images: string[] = feature.get('images');
//         if (!images) return;
//         const baseCoord = (feature.getGeometry() as Point).getCoordinates();

//         images.forEach((imageUrl, index) => {
//           const coord = [baseCoord[0], baseCoord[1] - index * 80];
//           labelImageFeatures.push(new Feature({
//             geometry: new Point(coord),
//             image_url: imageUrl,
//             image_id: feature.get('image_id') ? `${feature.get('image_id')}_${index}` : undefined,
//             original_label_id: feature.getId() || undefined,
//           }));
//         });
//       });

//       const rawImageFeatures = expandedFeatures.filter(f => f.get('layer') === 'IMAGE');
//       const imageFeatures: Feature[] = [];
//       rawImageFeatures.forEach((feature, index) => {
//         const geometry = feature.getGeometry();
//         if (!geometry || geometry.getType() !== 'Point') return;

//         const coord = (geometry as Point).getCoordinates();
//         const offsetCoord = [coord[0], coord[1] - index * 80];

//         const newFeature = new Feature({
//           geometry: new Point(offsetCoord),
//           image_url: feature.get('image_url') || feature.get('image') || '',
//           image_id: feature.get('image_id') || `image_${index}`,
//           original_label_id: feature.getId() || undefined,
//         });

//         imageFeatures.push(newFeature);
//       });

//       const allImageFeatures = [...labelImageFeatures, ...imageFeatures];

//       const imageSource = new VectorSource({ features: allImageFeatures });

//       const imageLayer = new VectorLayer({
//         source: imageSource,
//         style: (feature) => {
//           const imageUrl = feature.get('image_url');
//           if (!imageUrl) return;
//           const fullUrl = imageUrl.startsWith('http') ? imageUrl : backendUrl + imageUrl;
//           return new Style({
//             image: new Icon({
//               src: fullUrl,
//               scale: 0.2,
//               anchor: [0.5, 1]
//             })
//           });
//         },
//         visible: true,
//       });

//       this.map.addLayer(imageLayer);

//       if (this.modifyInteraction) {
//         this.map.removeInteraction(this.modifyInteraction);
//       }

//       this.modifyInteraction = new Modify({ source: imageSource });
//       this.map.addInteraction(this.modifyInteraction);

//       this.modifyInteraction.on('modifyend', evt => {
//         evt.features.forEach(feature => {
//           const geom = feature.getGeometry();
//           if (geom && geom.getType() === 'Point') {
//             const coords = (geom as Point).getCoordinates();
//             console.log('Image déplacée à:', coords);
//           }
//         });
//       });

//       const pointFeatures = expandedFeatures.filter(f =>
//         f.getGeometry()?.getType() === 'Point' && !labelLayers.includes(f.get('layer')) && f.get('layer') !== 'IMAGE'
//       );
//       const lineFeatures = expandedFeatures.filter(f => f.getGeometry()?.getType() === 'LineString');
//       const polygonFeatures = expandedFeatures.filter(f => f.getGeometry()?.getType() === 'Polygon');

//       const pointSource = new VectorSource({ features: pointFeatures });
//       const lineSource = new VectorSource({ features: lineFeatures });
//       const polygonSource = new VectorSource({ features: polygonFeatures });
//       const labelSource = new VectorSource({ features: labelFeatures });

//       const pointLayer = new VectorLayer({
//         source: pointSource,
//         style: feature => {
//           const layerName = feature.get('layer') || 'default';
//           const color = this.generateColorForLayer(layerName);
//           return new Style({
//             image: new CircleStyle({
//               radius: 6,
//               fill: new Fill({ color }),
//               stroke: new Stroke({ color: 'white', width: 1 }),
//             }),
//           });
//         },
//         visible: true,
//       });

//       const lineLayer = new VectorLayer({
//         source: lineSource,
//         style: new Style({
//           stroke: new Stroke({ color: 'green', width: 2 }),
//         }),
//         visible: true,
//       });

//       const polygonLayer = new VectorLayer({
//         source: polygonSource,
//         style: new Style({
//           stroke: new Stroke({ color: 'red', width: 2 }),
//           fill: new Fill({ color: 'rgba(240, 192, 192, 0.1)' }),
//         }),
//         visible: true,
//       });

//       const labelLayer = new VectorLayer({
//         source: labelSource,
//         style: feature => {
//           const label = feature.get('label') || '';
//           const height = feature.get('height') || 1;
//           const rotation = (feature.get('rotation') || 0) * Math.PI / 180;

//           const hAlignMap = ['left', 'center', 'right'];
//           const vAlignMap = ['alphabetic', 'bottom', 'middle', 'top', 'hanging'];

//           const textAlign = hAlignMap[feature.get('h_align')] || 'left';
//           const textBaseline = vAlignMap[feature.get('v_align')] || 'alphabetic';

//           const fontSize = Math.max(12, height * 5);

//           return new Style({
//             text: new Text({
//               text: label,
//               font: `${fontSize}px Calibri,sans-serif`,
//               fill: new Fill({ color: '#000' }),
//               stroke: new Stroke({ color: '#fff', width: 2 }),
//               overflow: true,
//               rotation,
//               textAlign: textAlign as CanvasTextAlign,
//               textBaseline: textBaseline as CanvasTextBaseline,
//             }),
//           });
//         },
//         visible: true,
//       });

//       this.map.addLayer(pointLayer);
//       this.map.addLayer(lineLayer);
//       this.map.addLayer(polygonLayer);
//       this.map.addLayer(labelLayer);

//       this.layersService.addLayer({ name: `chemise verte- Points`, layer: pointLayer, visible: true, type: 'point' });
//       this.layersService.addLayer({ name: `chemise verte - Lignes`, layer: lineLayer, visible: true, type: 'line' });
//       this.layersService.addLayer({ name: `chemise verte - Polygones`, layer: polygonLayer, visible: true, type: 'polygon' });
//       this.layersService.addLayer({ name: `chemise verte - Labels`, layer: labelLayer, visible: true, type: 'label' });
//       this.layersService.addLayer({ name: `chemise verte - Images`, layer: imageLayer, visible: true, type: 'image' });

//       this.layerNatureOptions.set(pointLayer, ['Poteau', 'Lampe', 'Capteur']);
//       this.layerNatureOptions.set(lineLayer, ['Route', 'Clôture']);
//       this.layerNatureOptions.set(polygonLayer, ['Bâtiment', 'Parcelle', 'Zone verte']);

//       this.layersList = this.layersService.layersList.slice();
//       this.layersList.sort((a, b) => {
//         const order = ['Points', 'Lignes', 'Polygones', 'Labels', 'Images'];
//         return order.indexOf(a.name.split(' - ')[1]) - order.indexOf(b.name.split(' - ')[1]);
//       });

//       if (expandedFeatures.length > 0) {
//         const extent = new VectorSource({ features: expandedFeatures }).getExtent();
//         this.map.getView().fit(extent, { padding: [50, 50, 50, 50] });
//       }
//     },
//     error: (err) => {
//       console.error('Erreur lors de la conversion DXF:', err);
//       alert('Erreur lors de la conversion DXF');
//     }
//   });
// }


    handleDXFFileInputFeuille(event: Event) {
      const input = event.target as HTMLInputElement;
      if (!input.files || input.files.length === 0) return;

      const file = input.files[0];
      const baseName = this.removeExtension(file.name);

      // Nettoyage des anciennes couches
      const currentLayers = this.layersService.layersList;
      currentLayers.forEach(l => {
        if (l.name.startsWith(baseName)) {
          this.map.removeLayer(l.layer);
        }
      });
      this.layersService.layersList = currentLayers.filter(l => !l.name.startsWith(baseName));

      // Nettoyage des overlays (au cas où)
      document.querySelectorAll('.ol-image-overlay').forEach(el => el.remove());
      this.map.getOverlays().getArray()
        .filter(o => o.getElement()?.classList.contains('ol-image-overlay'))
        .forEach(o => this.map.removeOverlay(o));

      // Préparation requête backend
      const formData = new FormData();
      formData.append('file', file);

      const affaireId = this.affaireService.getAffaireId();
      if (!affaireId) {
        console.error("Aucune affaire sélectionnée !");
        return;
      }
      const IGT = this.societeService.getInfo().numeroIGT
      formData.append('affaire_id', affaireId.toString());
      formData.append('IGT', IGT);
      const ville = this.societeService.getInfo().ville
      formData.append('ville', ville);
      const backendUrl = 'http://127.0.0.1:8000';

      this.http.post(`${backendUrl}/convert-dxf-to-shp-Feuille/`, formData).subscribe({
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
              (geom as MultiPoint).getCoordinates().forEach(coord => {
                expandedFeatures.push(new Feature({
                  geometry: new Point(coord),
                  ...f.getProperties()
                }));
              });
            } else if (type === 'GeometryCollection') {
              (geom as GeometryCollection).getGeometries().forEach(g => {
                expandedFeatures.push(new Feature({
                  geometry: g,
                  ...f.getProperties()
                }));
              });
            }
          });

          const labelLayers = ['LABEL_TEXT', 'LABEL_MTEXT'];
          const labelFeatures = expandedFeatures.filter(f => labelLayers.includes(f.get('layer')));
          const featuresWithImages = labelFeatures.filter(f => {
            const images = f.get('images');
            return images && Array.isArray(images) && images.length > 0;
          });

          const labelImageFeatures: Feature[] = [];
          featuresWithImages.forEach(feature => {
            const images: string[] = feature.get('images');
            if (!images) return;
            const baseCoord = (feature.getGeometry() as Point).getCoordinates();

            images.forEach((imageUrl, index) => {
              const coord = [baseCoord[0], baseCoord[1] - index * 80];
              labelImageFeatures.push(new Feature({
                geometry: new Point(coord),
                image_url: imageUrl,
                image_id: feature.get('image_id') ? `${feature.get('image_id')}_${index}` : undefined,
                original_label_id: feature.getId() || undefined,
              }));
            });
          });

          const rawImageFeatures = expandedFeatures.filter(f => f.get('layer') === 'IMAGE');
          const imageFeatures: Feature[] = [];
          rawImageFeatures.forEach((feature, index) => {
            const geometry = feature.getGeometry();
            if (!geometry || geometry.getType() !== 'Point') return;

            const coord = (geometry as Point).getCoordinates();
            const offsetCoord = [coord[0], coord[1] - index * 80];

            const newFeature = new Feature({
              geometry: new Point(offsetCoord),
              image_url: feature.get('image_url') || feature.get('image') || '',
              image_id: feature.get('image_id') || `image_${index}`,
              original_label_id: feature.getId() || undefined,
            });

            imageFeatures.push(newFeature);
          });

          const allImageFeatures = [...labelImageFeatures, ...imageFeatures];

          const imageSource = new VectorSource({ features: allImageFeatures });

          const imageLayer = new VectorLayer({
            source: imageSource,
            style: (feature) => {
              const imageUrl = feature.get('image_url');
              if (!imageUrl) return;
              const fullUrl = imageUrl.startsWith('http') ? imageUrl : backendUrl + imageUrl;
              return new Style({
                image: new Icon({
                  src: fullUrl,
                  scale: 0.2,
                  anchor: [0.5, 1]
                })
              });
            },
            visible: true,
          });

          this.map.addLayer(imageLayer);

          if (this.modifyInteraction) {
            this.map.removeInteraction(this.modifyInteraction);
          }

          this.modifyInteraction = new Modify({ source: imageSource });
          this.map.addInteraction(this.modifyInteraction);

          this.modifyInteraction.on('modifyend', evt => {
            evt.features.forEach(feature => {
              const geom = feature.getGeometry();
              if (geom && geom.getType() === 'Point') {
                const coords = (geom as Point).getCoordinates();
                console.log('Image déplacée à:', coords);
              }
            });
          });

          const pointFeatures = expandedFeatures.filter(f =>
            f.getGeometry()?.getType() === 'Point' && !labelLayers.includes(f.get('layer')) && f.get('layer') !== 'IMAGE'
          );
          const lineFeatures = expandedFeatures.filter(f => f.getGeometry()?.getType() === 'LineString');
          const polygonFeatures = expandedFeatures.filter(f => f.getGeometry()?.getType() === 'Polygon');

          const pointSource = new VectorSource({ features: pointFeatures });
          const lineSource = new VectorSource({ features: lineFeatures });
          const polygonSource = new VectorSource({ features: polygonFeatures });
          const labelSource = new VectorSource({ features: labelFeatures });

          const pointLayer = new VectorLayer({
            source: pointSource,
            style: feature => {
              const layerName = feature.get('layer') || 'default';
              const color = this.generateColorForLayer(layerName);
              return new Style({
                image: new CircleStyle({
                  radius: 6,
                  fill: new Fill({ color }),
                  stroke: new Stroke({ color: 'white', width: 1 }),
                }),
              });
            },
            visible: true,
          });

          const lineLayer = new VectorLayer({
            source: lineSource,
            style: new Style({
              stroke: new Stroke({ color: 'green', width: 2 }),
            }),
            visible: true,
          });

          const polygonLayer = new VectorLayer({
            source: polygonSource,
            style: new Style({
              stroke: new Stroke({ color: 'red', width: 2 }),
              fill: new Fill({ color: 'rgba(240, 192, 192, 0.1)' }),
            }),
            visible: true,
          });

          const labelLayer = new VectorLayer({
            source: labelSource,
            style: feature => {
              const label = feature.get('label') || '';
              const height = feature.get('height') || 1;
              const rotation = (feature.get('rotation') || 0) * Math.PI / 180;

              const hAlignMap = ['left', 'center', 'right'];
              const vAlignMap = ['alphabetic', 'bottom', 'middle', 'top', 'hanging'];

              const textAlign = hAlignMap[feature.get('h_align')] || 'left';
              const textBaseline = vAlignMap[feature.get('v_align')] || 'alphabetic';

              const fontSize = Math.max(12, height * 5);

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
                }),
              });
            },
            visible: true,
          });

          this.map.addLayer(pointLayer);
          this.map.addLayer(lineLayer);
          this.map.addLayer(polygonLayer);
          this.map.addLayer(labelLayer);

          this.layersService.addLayer({ name: `${baseName} - Points`, layer: pointLayer, visible: true, type: 'point' });
          this.layersService.addLayer({ name: `${baseName} - Lignes`, layer: lineLayer, visible: true, type: 'line' });
          this.layersService.addLayer({ name: `${baseName} - Polygones`, layer: polygonLayer, visible: true, type: 'polygon' });
          this.layersService.addLayer({ name: `${baseName} - Labels`, layer: labelLayer, visible: true, type: 'label' });
          this.layersService.addLayer({ name: `${baseName} - Images`, layer: imageLayer, visible: true, type: 'image' });

          this.layerNatureOptions.set(pointLayer, ['Poteau', 'Lampe', 'Capteur']);
          this.layerNatureOptions.set(lineLayer, ['Route', 'Clôture']);
          this.layerNatureOptions.set(polygonLayer, ['Bâtiment', 'Parcelle', 'Zone verte']);

          this.layersList = this.layersService.layersList.slice();
          this.layersList.sort((a, b) => {
            const order = ['Points', 'Lignes', 'Polygones', 'Labels', 'Images'];
            return order.indexOf(a.name.split(' - ')[1]) - order.indexOf(b.name.split(' - ')[1]);
          });

          if (expandedFeatures.length > 0) {
            const extent = new VectorSource({ features: expandedFeatures }).getExtent();
            this.map.getView().fit(extent, { padding: [50, 50, 50, 50] });
          }
        },
        error: (err) => {
          console.error('Erreur lors de la conversion DXF:', err);
          alert('Erreur lors de la conversion DXF');
        }
      });
    }


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
          this.layersService.toggleLayerVisibility(layerInfo.name);
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

    
    if (!layer.layer) {
      alert('⚠️ Pas de couche VectorLayer trouvée.');
      return;
    }

    console.log('📝 layer =', layer);
    console.log('🔍 layer.name =', layer.name);
    console.log('🔍 layer.type =', layer.type);
    console.log('🔍 layer.visible =', layer.visible);
    console.log('🔍 layer.layer =', layer.layer);
    console.log('📋 getFeaturesFromLayer(layer.layer) =', this.getFeaturesFromLayer(layer.layer));

    const features = this.getFeaturesFromLayer(layer.layer);
    if (!features.length) {
      alert('⚠️ Aucune géométrie à enregistrer.');
      return;
    }

    const affaireId = this.affaireService.getAffaireId();
    const geojson = new GeoJSON();

    const url =
      layer.type === 'point'
        ? 'http://127.0.0.1:8000/save-point-mec/'
        : layer.type === 'line'
        ? 'http://127.0.0.1:8000/save-line-mec/'
        : layer.type === 'polygon'
        ? 'http://127.0.0.1:8000/save-polygonn-mec/'
        : layer.type === 'image'
        ? 'http://127.0.0.1:8000/update-image-geometry/'
        : '';

    if (!url) {
      alert('❌ Type de couche inconnu.');
      return;
    }

    features.forEach((feature, idx) => {
      const geojsonFeature = geojson.writeFeatureObject(feature, {
        featureProjection: 'EPSG:3857',
        dataProjection: 'EPSG:26191'
      });
      const imageId = feature.get('image_id');
      console.log(`Image ID: ${imageId} Geometry:`, geojsonFeature.geometry);

      const payload:any = {
        geometry: geojsonFeature.geometry,
        affaire_id: affaireId
      };
      if (layer.type === 'image') {
        if (!imageId) {
          console.warn('⚠️ Image sans ID, mise à jour ignorée.');
          return;
        }
        payload.image_id = imageId;
      }
      console.log("Image ID:", imageId);
      this.http.post(url, payload).subscribe({
        next: (res: any) => {
          console.log(`✅ Feature ${idx + 1} sauvegardée.`, res);
          if (idx === features.length - 1) {
            alert('✅ Toutes les géométries de la couche ont été sauvegardées.');
          }
        },
        error: (err) => {
          console.error(err);
          alert('❌ Erreur lors de l’enregistrement');
        }
      });
    });
  }



  // exportToDXF() {
  //   const affaireId = this.affaireService.getAffaireId();
  //   fetch(`/export-dxf-from-db/${affaireId}`, {
  //     method: 'GET'
  //   })
  //     .then(response => {
  //       if (!response.ok) throw new Error("Erreur export DXF");
  //       return response.blob();
  //     })
  //     .then(blob => {
  //       const url = window.URL.createObjectURL(blob);
  //       const a = document.createElement('a');
  //       a.href = url;
  //       a.download = `export_affaire_${affaireId}.dxf`;
  //       a.click();
  //       window.URL.revokeObjectURL(url);
  //     })
  //     .catch(err => {
  //       console.error(err);
  //       alert("Erreur lors de l'export en DXF.");
  //     });
  // }

  exportToPDF() {
    const affaireId = this.affaireService.getAffaireId();
    if (!affaireId) {
      alert("Aucune affaire sélectionnée.");
      return;
    }

    const formData = new FormData();
    formData.append('affaire_id', affaireId.toString());

    this.http.post('http://127.0.0.1:8000/export-dxf-as-pdf/', formData, {
      responseType: 'blob' // Indiquer qu'on attend un blob (PDF)
    }).subscribe({
      next: (blob: Blob) => {
        console.log('PDF reçu');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_affaire_${affaireId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        alert("Erreur lors de l'export en PDF.");
        console.error(err);
      }
    });
  }

  exportMontagePhotos() {
    const affaireId = this.affaireService.getAffaireId();
    if (!affaireId) {
      alert("Aucune affaire sélectionnée.");
      return;
    }

    const formData = new FormData();
    formData.append('affaire_id', affaireId.toString());
    const IGT = this.societeService.getInfo().numeroIGT
    formData.append('IGT', IGT);
    const ville = this.societeService.getInfo().ville
    formData.append('ville', ville);
    const adresse = this.societeService.getInfo().adresse
    formData.append('adresse', adresse);
    const tele = this.societeService.getInfo().tele
    formData.append('tele', tele);
    const email = this.societeService.getInfo().email
    formData.append('email', email);
    this.http.post('http://127.0.0.1:8000/generate-pdf-from-dxf/', formData, {
      responseType: 'blob' // Indiquer qu'on attend un blob (PDF)
    }).subscribe({
      next: (blob: Blob) => {
        console.log('PDF reçu');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_affaire_${affaireId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        alert("Erreur lors de l'export en PDF.");
        console.error(err);
      }
    });
  }
  exportFeuillesAuxiliere() {
    const affaireId = this.affaireService.getAffaireId();
    if (!affaireId) {
      alert("Aucune affaire sélectionnée.");
      return;
    }

    const formData = new FormData();
    formData.append('affaire_id', affaireId.toString());

    this.http.post('http://127.0.0.1:8000/export-feuille-auxilieres/', formData, {
      responseType: 'blob'  // Attente d'un fichier binaire
    }).subscribe({
      next: (blob: Blob) => {
        console.log('Fichier DXF reçu');
        
        // Création de l'URL Blob
        const url = window.URL.createObjectURL(blob);

        // Création d'un lien de téléchargement
        const a = document.createElement('a');
        a.href = url;

        // Nom du fichier DXF téléchargé
        a.download = `plan_modifie_affaire_${affaireId}.dxf`;
        a.click();

        // Libération de l'URL blob
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        alert("Erreur lors du téléchargement du fichier DXF.");
        console.error(err);
      }
    });
  }



}
 