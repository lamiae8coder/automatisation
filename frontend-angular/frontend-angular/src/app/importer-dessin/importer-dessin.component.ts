import { Component,OnInit } from '@angular/core';
import { FeatureModalComponent } from '../feature-modal/feature-modal.component'; // adapte le chemin
import { NatureDialogComponent } from '../nature-dialog/nature-dialog.component';
   
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




@Component({
  selector: 'app-importer-dessin',
  standalone: false,
  templateUrl: './importer-dessin.component.html',
  styleUrls: ['./importer-dessin.component.css'] // 🪄 corrigé ici
})
export class ImporterDessinComponent implements OnInit{

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
  
    // Ajouter une couche dédiée pour afficher les points sélectionnés (optionnel)
    measureSource = new VectorSource();
    measureLayer!: VectorLayer;
    markerFeature: Feature | null = null; 
    showModalOnClick = false;
    layersList: { name: string, layer: VectorLayer, visible: boolean, type:string }[] = [];
    modifyInteractionn?: Modify;
    selectedLayerForModify: VectorLayer | null = null;
    selectInteraction: Select | null = null;
    selectedFeatures: Collection<Feature> = new Collection();

    sourceLayerForMove: VectorLayer | null = null;


    activeEditableLayer: VectorLayer | null = null;

    editingLayer: VectorLayer | null = null;
    classificationActive: boolean = false;
    classificationLayer: VectorLayer | null = null;
    layerNatureOptions: globalThis.Map<VectorLayer<any>, string[]> = new globalThis.Map();



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
          // const champsVoulu = ['Layer', 'PaperSpace', 'SubClasses'];
          delete properties['geometry']; // Supprimer la géométrie brute
          // const filtered = Object.fromEntries(
          //   Object.entries(properties).filter(([key]) => champsVoulu.includes(key))
          // );
          this.dialog.open(FeatureModalComponent, {
            width: '600px',
            data: properties
          });
        }
      }); 
  
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
      // Récupérer couche lignes et polygones
      const lineLayerInfo = this.layersList.find(l => l.type === 'line');
      const polygonLayerInfo = this.layersList.find(l => l.type === 'polygon');

      if (!lineLayerInfo || !polygonLayerInfo) {
        alert('Les couches lignes ou polygones ne sont pas chargées.');
        return;
      }

      const lineLayer = lineLayerInfo.layer;
      const polygonLayer = polygonLayerInfo.layer;

      // Nettoyer les interactions précédentes si existantes
      if (this.drawInteraction) this.map.removeInteraction(this.drawInteraction);
      if (this.snapInteraction) this.map.removeInteraction(this.snapInteraction);

      // Créer une source temporaire pour le dessin
      const tempSource = new VectorSource();

      // Créer l'interaction draw (dessin ligne)
      this.drawInteraction = new Draw({
        source: tempSource,
        type: 'LineString',
      });
      this.map.addInteraction(this.drawInteraction);

      // Créer interaction snap sur la source de la couche ligne (accrochage)
      this.snapInteraction = new Snap({
        source: lineLayer.getSource()!
      });
      this.map.addInteraction(this.snapInteraction);

      this.isDrawing = true;

      this.drawInteraction.on('drawend', (evt) => {
        const feature = evt.feature;
        const geom = feature.getGeometry() as any;
        let coords: Coordinate[] = geom.getCoordinates();

        if (coords.length < 3) {
          alert('Il faut au moins 3 points pour former un polygone.');
          this.cleanupDrawing();
          return;
        }

        // Fermer la ligne si non fermée (ajouter premier point à la fin)
        const firstPoint = coords[0];
        const lastPoint = coords[coords.length - 1];
        if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
          coords.push(firstPoint);
        }

        // Créer un polygone avec ces coordonnées fermées
        const polygon = new Polygon([coords]);

        // Ajouter le polygone à la couche polygones
        polygonLayer.getSource()?.addFeature(new Feature(polygon));

        alert('Polygone créé avec succès à partir de la ligne dessinée.');

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
  
  
    
  
    toggleLayer(layer: string, visible: boolean) {
      if (layer === 'osm' && this.osmLayer) {
        this.osmLayer.setVisible(visible);
      }
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

          // Décomposer les MultiPoint et GeometryCollection
          rawFeatures.forEach(f => {
            const geom = f.getGeometry();
            if (!geom) return;

            const type = geom.getType();

            if (type === 'Point' || type === 'LineString' || type === 'Polygon') {
              expandedFeatures.push(f);
            } 
            else if (type === 'MultiPoint') {
              const multiPoint = geom as MultiPoint;
              multiPoint.getCoordinates().forEach(coord => {
                expandedFeatures.push(
                  new Feature({
                    geometry: new Point(coord),
                    ...f.getProperties()
                  })
                );
              });
            } 
            else if (type === 'GeometryCollection') {
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

          const pointFeatures = expandedFeatures.filter(f => f.getGeometry()?.getType() === 'Point');
          const lineFeatures = expandedFeatures.filter(f => f.getGeometry()?.getType() === 'LineString');
          const polygonFeatures = expandedFeatures.filter(f => f.getGeometry()?.getType() === 'Polygon');

          const pointSource = new VectorSource({ features: pointFeatures });
          const lineSource = new VectorSource({ features: lineFeatures });
          const polygonSource = new VectorSource({ features: polygonFeatures });

          const pointLayer = new VectorLayer({
            source: pointSource,
            style: new Style({
              image: new CircleStyle({ radius: 5, fill: new Fill({ color: 'blue' }) })
            }),
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
              fill: new Fill({ color: 'rgba(255, 0, 0, 0.1)' })
            }),
            visible: true
          });

          this.map.addLayer(polygonLayer);
          this.map.addLayer(lineLayer);
          this.map.addLayer(pointLayer);

          const baseName = this.removeExtension(file.name);
          this.layersList.push(
            { name: `${baseName} - Points`, layer: pointLayer, visible: true, type: 'point'},
            { name: `${baseName} - Lignes`, layer: lineLayer, visible: true,  type: 'line' },
            { name: `${baseName} - Polygones`, layer: polygonLayer, visible: true, type: 'polygon' }
          );
          // Associer des natures par couche
          this.layerNatureOptions.set(pointLayer, ['Poteau', 'Lampe', 'Capteur']);
          this.layerNatureOptions.set(lineLayer, ['Route', 'Clôture']);
          this.layerNatureOptions.set(polygonLayer, ['Bâtiment', 'Parcelle', 'Zone verte']);


          this.layersList.sort((a, b) => {
            const order = ['Points', 'Lignes', 'Polygones'];
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




      toggleLayerVisibility(layerInfo: { name: string, layer: VectorLayer, visible: boolean }) {
        layerInfo.visible = !layerInfo.visible;
        layerInfo.layer.setVisible(layerInfo.visible);
      }

      

  

      // enableEditing(layer: VectorLayer) {
      //   // Retire l'interaction précédente
      //   if (this.modifyInteraction) {
      //     this.map.removeInteraction(this.modifyInteraction);
      //   }

      //   this.selectedLayerForModify = layer;

      //   // Crée une nouvelle interaction
      //   this.modifyInteraction = new Modify({
      //     source: layer.getSource() as VectorSource,
      //   });

      //   this.map.addInteraction(this.modifyInteraction);

      //   // Écoute les clics pour supprimer les entités
      //   this.map.on('singleclick', this.onMapClickDelete);
      // }


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
        if (!this.modifyInteraction || !this.selectedLayerForModify) return;

        const featuresToDelete: Feature[] = [];

        this.map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
          if (layer === this.selectedLayerForModify) {
            featuresToDelete.push(feature as Feature);
          }
        });

        if (featuresToDelete.length > 0) {
          const confirmDelete = confirm('Voulez-vous supprimer cet objet ?');
          if (confirmDelete) {
            const source = this.selectedLayerForModify.getSource();
            featuresToDelete.forEach(f => source?.removeFeature(f));
          }
        }
      }

      disableEditing() {
        if (this.modifyInteraction) {
          this.map.removeInteraction(this.modifyInteraction);
          this.modifyInteractionn = undefined;
          
        }
        this.editingLayer = null;
        this.selectedLayerForModify = null;
        this.classificationLayer = null;
        
        // this.activeEditableLayer = null;
       
        this.map.un('singleclick', this.onMapClickDelete);
        this.map.un('singleclick', this.classificationHandler);
        
      }

      enableMultiSelect(layer: VectorLayer) {
        this.disableEditing(); // désactive édition si active

        this.selectedLayerForModify = layer;

        // Supprimer interaction précédente
        if (this.selectInteraction) {
          this.map.removeInteraction(this.selectInteraction);
        }

        this.selectedFeatures = new Collection<Feature>();

        this.selectInteraction = new Select({
          layers: [layer],
          condition: click,
          toggleCondition: platformModifierKeyOnly,
          multi: true,
          features: this.selectedFeatures,
        
        });

        this.map.addInteraction(this.selectInteraction);
      }

      deleteSelectedFeatures() {
        if (!this.selectedLayerForModify || !this.selectInteraction) return;

        const source = this.selectedLayerForModify.getSource();
        const count = this.selectedFeatures.getLength();

        if (count === 0) {
          alert("Aucune entité sélectionnée.");
          return;
        }

        const confirmDelete = confirm(`Supprimer ${count} entité(s) sélectionnée(s) ?`);
        if (confirmDelete) {
          this.selectedFeatures.forEach(f => source?.removeFeature(f));
          this.selectedFeatures.clear(); // vider la sélection
        }
      }

      disableSelection() {
        if (this.selectInteraction) {
          this.map.removeInteraction(this.selectInteraction);
          this.selectInteraction = null;
          this.selectedFeatures.clear();
        }
        this.selectedLayerForModify = null;
      }
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


      // enableDeleteMode(layer: VectorLayer) {
      //   if (this.editingLayer !== layer) {
      //     alert("Veuillez activer le mode Édition d'abord.");
      //     return;
      //   }
      //   this.selectedLayerForModify = layer;

      //   this.map.un('singleclick', this.onMapClickDelete);
      //   this.map.on('singleclick', this.onMapClickDelete);
      // }

      enableDeleteMode(layer: VectorLayer) {
        if (this.editingLayer !== layer) {
          alert("Veuillez activer le mode Édition d'abord.");
          return;
        }

        // ✅ Désactiver la classification si active
        if (this.classificationActive) {
          this.map.un('singleclick', this.classificationHandler);
          this.classificationLayer = null;
          this.classificationActive = false;
        }

        this.selectedLayerForModify = layer;

        // 🔁 Réinitialiser l’événement de suppression (au cas où)
        this.map.un('singleclick', this.onMapClickDelete);
        this.map.on('singleclick', this.onMapClickDelete);
      }


      // enableClassification(layer: VectorLayer) {
      //   if (this.classificationLayer === layer && this.classificationActive) {
      //     this.map.un('singleclick', this.classificationHandler);
      //     this.classificationLayer = null;
      //     this.classificationActive = false;
      //     alert("Mode classification désactivé.");
      //     return;
      //   }

      //   this.classificationLayer = layer;
      //   this.classificationActive = true;

      //   // Assurez-vous que le handler n'est pas dupliqué
      //   this.map.un('singleclick', this.classificationHandler);

      //   this.map.on('singleclick', this.classificationHandler);
      //   alert("Mode classification activé. Cliquez sur un objet pour définir sa nature.");
      // }

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

        const feature = rawFeature as Feature; // 👈 Caster explicitement

        if (feature) {
          let currentNature = feature.get('nature') || '';

          // const newNature = prompt('Entrez la nature de cet objet :', currentNature);

          // if (newNature !== null && newNature.trim() !== '') {
          //   feature.set('nature', newNature);
          //   alert(`Nature définie : ${newNature}`);

          //   // ✅ Appliquer un style avec texte (label)
          //   // feature.setStyle(new Style({
          //   //   stroke: new Stroke({ color: 'blue', width: 2 }),
          //   //   fill: new Fill({ color: 'rgba(0, 0, 255, 0.1)' }),
          //   //   text: new Text({
          //   //     text: newNature,
          //   //     font: '12px Arial',
          //   //     fill: new Fill({ color: '#000' }),
          //   //     stroke: new Stroke({ color: '#fff', width: 2 }),
          //   //     overflow: true
          //   //   })
          //   // }));
          // }
          const natureOptions = this.layerNatureOptions.get(this.classificationLayer) || [];

          // const dialogRef = this.dialog.open(NatureDialogComponent, {
          //   width: '400px',
          //   data: {
          //     current: currentNature,
          //     options: natureOptions
          //   }
          // });

          // dialogRef.afterClosed().subscribe((result: string | null) => {
          //   if (result && result.trim() !== '') {
          //     feature.set('nature', result);
          //     alert(`Nature définie : ${result}`);
          //   }
          // });

          const layerType = this.layersList.find(l => l.layer === this.classificationLayer)?.type || '';

          const dialogRef = this.dialog.open(NatureDialogComponent, {
            width: '400px',
            data: {
              current: currentNature,
              options: natureOptions,
              type: layerType // ✅ transmettre "polygon", "line", etc.
            }
          });

          dialogRef.afterClosed().subscribe((result: any) => {
            if (result) {
              if (typeof result === 'string') {
                feature.set('nature', result);
                alert(`Nature définie : ${result}`);    
              } else {
                feature.set('nature', result.nature);
                feature.set('consistance', result.consistance);
                alert(`Nature : ${result.nature} | Consistance : ${result.consistance}`);
              }
            }
          });

          
        }
      };
    




}
