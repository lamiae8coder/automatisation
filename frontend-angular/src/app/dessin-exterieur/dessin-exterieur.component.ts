import { Component, OnInit } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat, get as getProjection, transform } from 'ol/proj';
import { toStringXY } from 'ol/coordinate';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import { saveAs } from 'file-saver';
import * as shpwrite from 'shp-write';
import * as shapefile from 'shapefile';
import { HttpClient } from '@angular/common/http';
import GeoJSON from 'ol/format/GeoJSON';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style';
import Overlay from 'ol/Overlay';



@Component({ 
  selector: 'app-dessin-exterieur',
  standalone: false,
  templateUrl: './dessin-exterieur.component.html',
  styleUrl: './dessin-exterieur.component.css'
})
export class DessinExterieurComponent implements OnInit {
  map!: Map;
  cursorCoords: string = '';
  importedFeatures: any[] = [];
  osmLayer!: TileLayer;
  shapefileLayer?: VectorLayer;
  shapefileLayers: VectorLayer[] = [];
  popupOverlay!: Overlay;

  constructor(private http: HttpClient) {}
  
  ngOnInit(): void {
    // Définir la projection Lambert Conique Conforme Merchich
    proj4.defs('EPSG:26191', '+proj=lcc +lat_1=33.3 +lat_0=33.3 +lon_0=-5.4 +k_0=0.999625769 +x_0=500000 +y_0=300000 +ellps=clrk80ign +towgs84=31,146,47,0,0,0,0 +units=m +no_defs');
    register(proj4);
    

    this.osmLayer = new TileLayer({
      source: new OSM(),
      visible: true // par défaut visible
    });

    // this.map = new Map({
    //   target: 'map',
    //   layers: [
    //     new TileLayer({
    //       source: new OSM()
    //     })
    //   ],
    //   view: new View({
    //     projection: 'EPSG:3857', // Affichage en Web Mercator (OSM), conversion nécessaire pour afficher les coordonnées en Merchich
    //     center: fromLonLat([-5.4, 32.0]), // Centrage sur le Maroc
    //     zoom: 6
    //   })
    // });

    this.map = new Map({
      target: 'map',
      layers: [this.osmLayer],
      view: new View({
        projection: 'EPSG:3857',
        center: fromLonLat([-5.4, 32.0]),
        zoom: 6
      })
    });

    this.map.on('pointermove', (event) => {
      const coords = event.coordinate;
      const transformedCoords = transform(coords, 'EPSG:3857', 'EPSG:26191');
      this.cursorCoords = toStringXY(transformedCoords, 2) + ' (Lambert Merchich)';
    });


    const container = document.getElementById('popup') as HTMLElement;

    this.popupOverlay = new Overlay({
      element: container,
      autoPan: {
        animation: {
          duration: 250
        }
      }
    });

    this.map.addOverlay(this.popupOverlay);

    this.map.on('singleclick', (event) => {
      const feature = this.map.forEachFeatureAtPixel(event.pixel, (feat) => feat);
      // if (feature) {
      //   const properties = feature.getProperties();
      //   const content = `<p><strong>Informations :</strong></p><ul>` +
      //     Object.entries(properties)
      //       .filter(([key]) => key !== 'geometry') // On ne veut pas afficher la géométrie brute
      //       .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
      //       .join('') +
      //     `</ul>`;

      //   const popupContent = document.getElementById('popup-content') as HTMLElement;
      //   popupContent.innerHTML = content;

      //   this.popupOverlay.setPosition(event.coordinate);
      // } else {
      //   this.popupOverlay.setPosition(undefined);
      // }
      if (feature) {
      const properties = feature.getProperties();
      const popupContent = document.getElementById('popup-content') as HTMLElement;

      //  Afficher uniquement les propriétés que tu choisis
      const displayedProperties = ['Nature', 'Num']; // 👉 Ajoute ici les clés que tu veux afficher

      let content = '<p><strong>Informations :</strong></p><ul>';
      displayedProperties.forEach(prop => {
        if (properties[prop] !== undefined) {
          content += `<li><strong>${prop}:</strong> ${properties[prop]}</li>`;
        }
      });
      content += '</ul>';

      popupContent.innerHTML = content;

      // Afficher le popup à la position cliquée
        this.popupOverlay.setPosition(event.coordinate);
      } else {
        // Si aucun feature n'est cliqué, cacher le popup
        this.popupOverlay.setPosition(undefined);
      }

    });


  }

  importFile() {
    const input = document.getElementById('fileInput') as HTMLInputElement;
    input.click();
  }

  // handleFileInput(event: any) {
  //   const file = event.target.files[0];
  //   if (file) {
  //     const reader = new FileReader();
  //     reader.onload = () => {
  //       console.log('Contenu du fichier importé :', reader.result);
  //       // ✅ Ici, tu peux traiter les coordonnées ou les objets importés
  //     };
  //     reader.readAsText(file);
  //   }
  // }

  handleFileInput(event: any) {
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0];
    // const file = event.target.files[0];
    if (file) {
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
        this.readTextFile(file);
      } else if (fileName.endsWith('.zip')) {
        // 👉 Lancer l'import via FastAPI
        this.uploadShapefile(file);
      } else {
        alert('Format de fichier non pris en charge.');
      }
    }
  }


  readTextFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      console.log('Contenu du fichier TXT/CSV :', content);

      // Supposons que le fichier contient des lignes : easting,northing
      const lines = content.split('\n');
      lines.forEach(line => {
        const parts = line.split(',');
        if (parts.length >= 2) {
          const x = parseFloat(parts[0]);
          const y = parseFloat(parts[1]);
          console.log(`Point : ${x}, ${y}`);

          // Tu peux ici stocker et afficher ces points sur la carte
        }
      });
    };
    reader.readAsText(file);
  }



  // readShapefile(file: File) {
  //   alert('Import de shapefile : nécessite d\'utiliser shapefile-js avec un serveur local ou zip complet.');
  //   // La lecture de shapefiles en pur front Angular est complexe sans un serveur car shapefile-js nécessite aussi les .dbf et .shx.

  //   // Si tu veux, je peux te préparer un backend FastAPI ou Node.js pour lire les shapefiles proprement.

  //   // Sinon, tu peux lire les shapefiles si tu fournis un .zip avec shp-write, shapefile-js et JSZip combinés.
  // }

  exportFile(format: string) {
    if (format === 'csv') {
      const data = 'Easting,Northing\n500000,300000\n';
      const blob = new Blob([data], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, 'export.csv');
    } else if (format === 'txt') {
      const data = 'Coordonnées Lambert Merchich : 500000, 300000\n';
      const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, 'export.txt');
    } else if (format === 'shapefile') {
      alert('Export Shapefile : Cette fonctionnalité nécessite un traitement backend ou des librairies avancées comme shp-write.');
    }
  }

  exportShapefile() {
    // Exemple de points à exporter (tu peux remplacer par les points de ton projet)
    const features = [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [500000, 300000] // Exemple de coordonnées Lambert Merchich
        },
        properties: { name: 'Point 1' }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [502000, 305000]
        },
        properties: { name: 'Point 2' }
      }
    ];

    // Exporter en shapefile
    shpwrite.download({
      type: 'FeatureCollection',
      features: features
    }, { folder: 'export', types: { point: 'points' } });
  }

  uploadShapefile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    this.http.post('http://127.0.0.1:8000/upload-shapefile/', formData).subscribe({
      next: (geojson: any) => {
        console.log('GeoJSON reçu :', geojson); // ✅ Ajoute ce log
        this.displayGeoJSON(geojson);
      },
      error: (err) => {
        alert('Erreur lors de l\'import du shapefile.');
        console.error(err);
      }
    });
  }




  displayGeoJSON(geojson: any) {
  const vectorSource = new VectorSource({
    features: new GeoJSON().readFeatures(geojson, {
      dataProjection: 'EPSG:26191',          // projection d'origine du GeoJSON
      featureProjection: 'EPSG:3857'
     // Adapter si nécessaire
    })
  });

  // const vectorLayer = new VectorLayer({
  //     source: vectorSource,
  //     style: new Style({
  //       image: new CircleStyle({
  //         radius: 5,
  //         fill: new Fill({ color: 'red' }),
  //         stroke: new Stroke({ color: 'black', width: 1 })
  //       }),
  //       stroke: new Stroke({
  //         color: 'blue',
  //         width: 2
  //       }),
  //       fill: new Fill({
  //         color: 'rgba(0, 0, 255, 0.1)'
  //       })
  //     })
  //   });

  //   this.map.addLayer(vectorLayer);


    // this.shapefileLayer = new VectorLayer({
    //   source: vectorSource,
    //   visible: true,
    //   style: new Style({
    //     stroke: new Stroke({
    //       color: 'blue',
    //       width: 1
    //     }),
    //     fill: new Fill({
    //       color: 'rgba(255, 0, 0, 0.2)'
    //     })
    //   })
    // });

    const newLayer = new VectorLayer({
      source: vectorSource,
      visible: true,
      style: new Style({
        stroke: new Stroke({
          color: this.getRandomColor(), // 👉 Chaque couche peut avoir une couleur différente
          width: 1
        }),
        fill: new Fill({
          color: 'rgba(255, 0, 0, 0.2)'
        })
      })
    });

    // Ajouter la nouvelle couche à la carte
    this.map.addLayer(newLayer);
    // this.map.addLayer(this.shapefileLayer);

    // Ajouter dans la liste des couches shapefiles
    this.shapefileLayers.push(newLayer);

    const extent = vectorSource.getExtent();
    this.map.getView().fit(extent, { duration: 1000, padding: [20, 20, 20, 20] });

  }

//   toggleLayer(layer: string, visible: boolean) {
//   if (layer === 'osm' && this.osmLayer) {
//     this.osmLayer.setVisible(visible);
//   }
//   if (layer === 'shapefile' && this.shapefileLayer) {
//     this.shapefileLayer.setVisible(visible);
//   }
// }


toggleLayer(layer: string, visible: boolean) {
  if (layer === 'osm' && this.osmLayer) {
    this.osmLayer.setVisible(visible);
  }
  if (layer === 'shapefile') {
    this.shapefileLayers.forEach(layer => {
      layer.setVisible(visible);
    });
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



}
