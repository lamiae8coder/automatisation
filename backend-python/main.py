from fastapi import FastAPI, Depends, HTTPException, Body, Request
from sqlalchemy.orm import Session
from fastapi import APIRouter
from database import SessionLocal, engine
from models import Base, Person, ImportedShapefile,Affaire,Image, DesignatedShape, PolygonesLayer,PointsLayer,LignesLayer,PolygonesLayerMec,PointsLayerMec,LignesLayerMec
from schemas import PersonCreate, AffaireCreate, ImageCreate
import logging
from fastapi.middleware.cors import CORSMiddleware 
from fastapi import FastAPI, UploadFile, File, Form
import shapefile
import zipfile
import os, shutil
import json
from shapely.geometry import shape, mapping, Point, Polygon
import geopandas as gpd
import rarfile
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from routers import image
from shapely.geometry import shape
from geoalchemy2.shape import from_shape
from geoalchemy2 import Geometry
from geoalchemy2.elements import WKTElement
from fastapi.responses import JSONResponse
import ezdxf
from fastapi.responses import FileResponse
from math import cos, sin, pi, radians
from shapely.geometry import LineString as ShapelyLineString
from shapely.ops import split as shapely_split
from shapely.geometry import GeometryCollection, Point as ShapelyPoint
import traceback
from datetime import datetime,date
# from osgeo import ogr, osr
import geopandas as gpd
import ezdxf
from io import BytesIO,StringIO
import tempfile
from fastapi.responses import Response
import os, uuid
from reportlab.lib.pagesizes import A4, A3
import matplotlib.pyplot as plt
from ezdxf.addons.drawing import matplotlib as ezdxf_draw
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
# from PIL import Image  # au lieu de reportlab
# from PIL import Image as PILImage
from fpdf import FPDF
from ezdxf.addons.drawing import matplotlib as ezdxf_matplotlib
from ezdxf.addons.drawing import RenderContext, Frontend
import matplotlib.pyplot as plt
from ezdxf.addons.drawing.matplotlib import MatplotlibBackend
import warnings
import cairosvg
from ezdxf.addons.drawing import RenderContext
import ezdxf
import cairo
# from ezdxf.addons.drawing.backends import CairoBackend
from ezdxf.addons.drawing import RenderContext, Frontend
import cairocffi as cairo
# from ezdxf.addons.drawing.backends import MatplotlibBackend  # exemple d’un backend fourni
from sqlalchemy.orm import Session
from ezdxf import readfile
from ezdxf.addons.drawing.svg import SVGBackend
from ezdxf.addons.drawing.svg import SVGBackend
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import black, red, blue
from xml.etree import ElementTree as ET
import cairosvg
from io import BytesIO
import math
from reportlab.lib import colors
from PIL import Image as PILImage
from typing import List, Tuple, Dict, Any
from ezdxf.path import make_path




app = FastAPI()
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.include_router(image.router) 
router = APIRouter()
app.include_router(router)

# Création de l'application FastAPI


# Configuration CORS - Doit venir APRÈS la création de l'app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Création des tables
Base.metadata.create_all(bind=engine)

# Dépendance pour la base de données
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()




@app.post("/affaire", status_code=201)
def create_affaire(affaire: AffaireCreate, db: Session = Depends(get_db)):
    try:
       

        db_affaire = Affaire(
            titremec=affaire.titremec,
            proprietefr=affaire.proprietefr,
            proprietear=affaire.proprietear,
            plandate=affaire.plandate,
            situationfr=affaire.situationfr,
            situationar=affaire.situationar,
            mappecadre=affaire.mappecadre,
            datemec=affaire.datemec,
            mappereperage=affaire.mappereperage,
            titreorigine=affaire.titreorigine,
            nometprenom=affaire.nometprenom,
            cin=affaire.cin,
            naturetravail=affaire.naturetravail,
            servicecadastre=affaire.servicecadastre,
            surface=affaire.surface,
            numerosd=affaire.numerosd,
            empietement=affaire.empietement,
            # surfaceempietement=affaire.surfaceempietement,
            surfaceempietement = affaire.surfaceempietement if affaire.empietement else None,

            consistance=affaire.consistance,
            charges=affaire.charges,
            qualite=affaire.qualite
 
        )
        db.add(db_affaire)
        db.commit()
        db.refresh(db_affaire)
        return {
            "message": "aAffaire ajoutée avec succès.",
            "titreMec": db_affaire.titremec,
            "id":db_affaire.id
            
            
        }
    except HTTPException:
        raise  # On relève les HTTPException déjà gérées
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur DB : {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Erreur interne du serveur lors de la création"
        )


@app.post("/image", status_code=201)
def create_image(image: ImageCreate, db: Session = Depends(get_db)):
    try:
       

        db_image = Image(
            affaire_id=image.affaire_id,
            file_path=image.file_path,
            type=image.type
            
        
        )
        db.add(db_image)
        db.commit()
        db.refresh(db_image)
        return {
            "message": "Image ajoutée avec succès.",
            "type": db_image.type,
            "id":db_image.id
            
            
        }
    except HTTPException:
        raise  # On relève les HTTPException déjà gérées
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur DB : {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Erreur interne du serveur lors de la création"
        )







# temp_polygon_gdf = None

# @app.post("/save-polygon/")
# async def save_polygon(request: Request):
#     global temp_polygon_gdf
#     data = await request.json()
#     print("📨 Données GeoJSON reçues :", data)

#     try:
#         gdf = gpd.GeoDataFrame.from_features([{
#             "type": "Feature",
#             "geometry": data["geometry"],
#             "properties": data.get("properties", {})
#         }], crs="EPSG:26191")

#         temp_polygon_gdf = gdf  # Stockage dans variable globale en mémoire

#         print("✅ Polygone converti en GeoDataFrame :")
#         print(gdf)

#         # Tu peux aussi sauvegarder sur disque si tu veux, par ex:
#         gdf.to_file("polygon_output.shp")

#         # Message de validation détaillé (extrait WKT résumé)
#         poly_wkt = gdf.geometry.iloc[0].wkt
#         poly_preview = poly_wkt[:60] + "..." if len(poly_wkt) > 60 else poly_wkt

#         return {
#             "message": "Polygone sauvegardé et importé avec succès.",
#             "polygon_preview": poly_preview
#         }

#     except Exception as e:
#         print("❌ Erreur de traitement :", e)
#         return {"error": str(e)}


@app.post("/save-polygon/")
async def save_polygon(request: Request):
    data = await request.json()
    geometry = data.get("geometry")
    affaire_id = data.get("affaire_id")

    if not geometry:
        return {"error": "Aucune géométrie fournie."}

    try:
        # 🔁 Convertir le GeoJSON en géométrie Shapely
        shapely_geom = shape(geometry)

        # 🎯 Créer un WKTElement compatible PostGIS avec le bon SRID
        geom_wkt = WKTElement(shapely_geom.wkt, srid=26191)  # adapte le SRID si nécessaire

        # 📦 Enregistrer dans la base
        with SessionLocal() as db:
            shape_entry = DesignatedShape(
                affaire_id=affaire_id,
                # affaire_id=1,  # à remplacer dynamiquement si besoin
                source_file="dessin manuel",
                geom=geom_wkt
            )
            db.add(shape_entry)
            db.commit()
            db.refresh(shape_entry)

        return {
            "message": "✅ Polygone sauvegardé dans la base de données.",
            "id": shape_entry.id
        }

    except Exception as e:
        return {"error": str(e)}

# images






# Upload endpoint
@app.post("/upload-image/")
async def upload_image(
    affaire_id: int = Form(...),
    type: str = Form(...),
    file: UploadFile = File(...)
):
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_location = os.path.join(upload_dir, file.filename)

    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Save to DB
    db = SessionLocal()
    image = Image(affaire_id=affaire_id, file_path=file_location, type=type)
    db.add(image)
    db.commit()
    db.refresh(image)
    db.close()  

    return {"message": "Image uploaded", "id": image.id}















@app.post("/upload-shapefile/")
async def upload_shapefile(file: UploadFile = File(...)):
    global temp_polygon_gdf

    # Vérification du polygone temporaire
    if temp_polygon_gdf is None:
        return {"error": "Aucun polygone n’a été reçu. Veuillez d'abord dessiner un polygone."}

    try:
        # ✅ Calcul du buffer de 300m autour du polygone (et pas du centroïde)
        buffer_geom = temp_polygon_gdf.geometry.buffer(10).iloc[0]
    except Exception as e:
        return {"error": f"Erreur lors du calcul du buffer : {e}"}

    # 🔹 Sauvegarde temporaire du fichier ZIP
    zip_path = f"temp/{file.filename}"
    os.makedirs('temp', exist_ok=True)

    with open(zip_path, "wb") as f:
        f.write(await file.read())

    # 🔹 Extraction du ZIP
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall("temp/extracted")

    # 🔹 Recherche du fichier .shp
    shp_file = None
    for root, _, files in os.walk("temp/extracted"):
        for f_name in files:
            if f_name.endswith('.shp'):
                shp_file = os.path.join(root, f_name)
                break
        if shp_file:
            break

    if not shp_file:
        return {"error": "Fichier .shp non trouvé dans le ZIP."}

    try:
        # ✅ Lecture avec geopandas
        shapefile_gdf = gpd.read_file(shp_file)

        # ✅ Assure-toi que la projection est correcte
        if shapefile_gdf.crs != "EPSG:26191":
            shapefile_gdf = shapefile_gdf.to_crs("EPSG:26191")

        # ✅ Filtrage spatial : entités intersectant le buffer
        # filtered_gdf = shapefile_gdf[shapefile_gdf.intersects(buffer_geom)]
        filtered_gdf = shapefile_gdf[
            shapefile_gdf.intersects(buffer_geom) & 
            ~shapefile_gdf.within(temp_polygon_gdf.geometry.iloc[0])
        ]

        print(f"✅ {len(filtered_gdf)} entités intersectent le buffer de 10 m.")

        # ✅ Conversion en GeoJSON
        geojson = json.loads(filtered_gdf.to_json())

        return geojson

    except Exception as e:
        print(f"❌ Erreur de traitement du shapefile : {e}")
        return {"error": str(e)}








from fastapi import UploadFile, File
import os, zipfile, json
import geopandas as gpd
import rarfile
from pathlib import Path



from shapely.geometry import MultiPolygon, Polygon

def ensure_multipolygon(geom):
    """
    Assure que la géométrie est un MultiPolygon.
    Si c’est un Polygon, le convertit.
    Sinon, retourne None.
    """
    if isinstance(geom, Polygon):
        return MultiPolygon([geom])
    elif isinstance(geom, MultiPolygon):
        return geom
    else:
        return None




@app.post("/upload-shapefilee/")
async def upload_shapefilee(
    file: UploadFile = File(...),
    affaire_id: int = Form(...),   # <-- affaire_id reçu en champ Form
    db: Session = Depends(get_db)
):
    os.makedirs("temp", exist_ok=True)
    os.makedirs("temp/extracted", exist_ok=True)

    filename = file.filename
    ext = Path(filename).suffix.lower()
    archive_path = os.path.join("temp", filename)

    # Sauvegarde temporaire
    with open(archive_path, "wb") as f:
        f.write(await file.read())

    try:
        if ext == ".zip":
            with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                zip_ref.extractall("temp/extracted")
        elif ext == ".rar":
            with rarfile.RarFile(archive_path, 'r') as rar_ref:
                rar_ref.extractall("temp/extracted")
        else:
            return {"error": "Format non supporté (ZIP ou RAR uniquement)."}

    except Exception as e:
        return {"error": f"Erreur d'extraction : {e}"}

    shp_file = None
    for root, _, files in os.walk("temp/extracted"):
        for f_name in files:
            if f_name.endswith(".shp"):
                shp_file = os.path.join(root, f_name)
                break
        if shp_file:
            break

    if not shp_file:
        return {"error": "Fichier .shp non trouvé."}

    try:
        shapefile_gdf = gpd.read_file(shp_file)

        if shapefile_gdf.crs != "EPSG:26191":
            shapefile_gdf = shapefile_gdf.to_crs("EPSG:26191")

        # Récupérer DesignatedShape par affaire_id reçu
        latest_shape = db.query(DesignatedShape).filter(DesignatedShape.affaire_id == affaire_id).order_by(DesignatedShape.id.desc()).first()
        if not latest_shape:
            return JSONResponse(status_code=400, content={"error": "Aucun dessin trouvé pour cet affaire."})

        buffer_geom = shape(json.loads(db.scalar(latest_shape.geom.ST_AsGeoJSON()))).buffer(300)

        filtered_gdf = shapefile_gdf[
            shapefile_gdf.intersects(buffer_geom) & 
            ~shapefile_gdf.within(shape(json.loads(db.scalar(latest_shape.geom.ST_AsGeoJSON()))))
        ]

        if filtered_gdf.empty:
            return {"message": "Aucune entité à importer selon les critères spatiaux."}

        for _, row in filtered_gdf.iterrows():
            geom_mp = ensure_multipolygon(row.geometry)
            if geom_mp is None:
                continue

            geom_wkt = WKTElement(geom_mp.wkt, srid=26191)
            entry = ImportedShapefile(
                affaire_id=affaire_id,
                file_name=Path(shp_file).name,
                geom=geom_wkt
            )
            db.add(entry)

        db.commit()
        geojson = json.loads(filtered_gdf.to_json())
        return JSONResponse(content=geojson)

    except Exception as e:
        return {"error": f"Erreur lors du traitement : {e}"}

    finally:
        try:
            shutil.rmtree("temp/extracted")
        except Exception as cleanup_err:
            print(f"Erreur nettoyage : {cleanup_err}")


# @app.post("/upload-shapefilee/")
# async def upload_shapefilee(file: UploadFile = File(...), db: Session = Depends(get_db)):
#     os.makedirs("temp", exist_ok=True)
#     os.makedirs("temp/extracted", exist_ok=True)

#     filename = file.filename
#     ext = Path(filename).suffix.lower()
#     archive_path = os.path.join("temp", filename)

#     with open(archive_path, "wb") as f:
#         f.write(await file.read())

#     try:
#         if ext == ".zip":
#             with zipfile.ZipFile(archive_path, 'r') as zip_ref:
#                 zip_ref.extractall("temp/extracted")
#         elif ext == ".rar":
#             with rarfile.RarFile(archive_path, 'r') as rar_ref:
#                 rar_ref.extractall("temp/extracted")
#         else:
#             raise HTTPException(status_code=400, detail="Format non supporté (ZIP ou RAR uniquement).")
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=f"Erreur d'extraction : {e}")

#     shp_file = None
#     for root, _, files in os.walk("temp/extracted"):
#         for f_name in files:
#             if f_name.endswith(".shp"):
#                 shp_file = os.path.join(root, f_name)
#                 break
#         if shp_file:
#             break

#     if not shp_file:
#         raise HTTPException(status_code=400, detail="Fichier .shp non trouvé.")

#     try:
#         shapefile_gdf = gpd.read_file(shp_file)

#         if shapefile_gdf.crs != "EPSG:26191":
#             shapefile_gdf = shapefile_gdf.to_crs("EPSG:26191")

#         latest_shape = db.query(DesignatedShape).order_by(DesignatedShape.id.desc()).first()
#         if not latest_shape:
#             raise HTTPException(
#                 status_code=400,
#                 detail="Veuillez désigner un polygone avant d'importer le shapefile."
#             )

#         affaire_id = latest_shape.affaire_id
#         buffer_geom = shape(json.loads(db.scalar(latest_shape.geom.ST_AsGeoJSON()))).buffer(300)

#         filtered_gdf = shapefile_gdf[
#             shapefile_gdf.intersects(buffer_geom) &
#             ~shapefile_gdf.within(shape(json.loads(db.scalar(latest_shape.geom.ST_AsGeoJSON()))))
#         ]

#         if filtered_gdf.empty:
#             return {"message": "Aucune entité à importer selon les critères spatiaux."}

#         for _, row in filtered_gdf.iterrows():
#             geom_mp = ensure_multipolygon(row.geometry)
#             if geom_mp is None:
#                 continue

#             geom_wkt = WKTElement(geom_mp.wkt, srid=26191)
#             entry = ImportedShapefile(
#                 affaire_id=affaire_id,
#                 file_name=Path(shp_file).name,
#                 geom=geom_wkt
#             )
#             db.add(entry)

#         db.commit()
#         geojson = json.loads(filtered_gdf.to_json())
#         return JSONResponse(content=geojson)

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Erreur lors du traitement : {e}")
#     finally:
#         try:
#             shutil.rmtree("temp/extracted")
#         except Exception as cleanup_err:
#             print(f"⚠️ Erreur lors du nettoyage : {cleanup_err}")





# @app.post("/upload-shapefilee/")
# async def upload_shapefilee(file: UploadFile = File(...), db: Session = Depends(get_db)):
#     # 📁 Création des dossiers temporaires
#     os.makedirs("temp", exist_ok=True)
#     os.makedirs("temp/extracted", exist_ok=True)

#     filename = file.filename
#     ext = Path(filename).suffix.lower()
#     archive_path = os.path.join("temp", filename)

#     # 📅 Sauvegarde temporaire
#     with open(archive_path, "wb") as f:
#         f.write(await file.read())

#     # 📆 Extraction de l'archive
#     try:
#         if ext == ".zip":
#             with zipfile.ZipFile(archive_path, 'r') as zip_ref:
#                 zip_ref.extractall("temp/extracted")
#         elif ext == ".rar":
#             with rarfile.RarFile(archive_path, 'r') as rar_ref:
#                 rar_ref.extractall("temp/extracted")
#         else:
#             return {"error": "Format non supporté (ZIP ou RAR uniquement)."}
#     except Exception as e:
#         return {"error": f"Erreur d'extraction : {e}"}

#     # 🔍 Trouver le fichier .shp
#     shp_file = None
#     for root, _, files in os.walk("temp/extracted"):
#         for f_name in files:
#             if f_name.endswith(".shp"):
#                 shp_file = os.path.join(root, f_name)
#                 break
#         if shp_file:
#             break

#     if not shp_file:
#         return {"error": "Fichier .shp non trouvé."}

#     try:
#         shapefile_gdf = gpd.read_file(shp_file)

#         if shapefile_gdf.crs != "EPSG:26191":
#             shapefile_gdf = shapefile_gdf.to_crs("EPSG:26191")

#         # 🔍 Récupération du dernier shape enregistré pour affaire
#         latest_shape = db.query(DesignatedShape).order_by(DesignatedShape.id.desc()).first()
#         if not latest_shape:
#             return {"error": "Aucun polygone de base (DesignatedShape) n'a été trouvé."}

#         affaire_id = latest_shape.affaire_id
#         buffer_geom = shape(json.loads(db.scalar(latest_shape.geom.ST_AsGeoJSON()))).buffer(300)

#         # ✅ Filtrer par intersection avec buffer mais hors polygone
#         filtered_gdf = shapefile_gdf[
#             shapefile_gdf.intersects(buffer_geom) &
#             ~shapefile_gdf.within(shape(json.loads(db.scalar(latest_shape.geom.ST_AsGeoJSON()))))
#         ]

#         # 🚫 Si vide : retourner un message sans erreur
#         if filtered_gdf.empty:
#             return {"message": "Aucune entité à importer selon les critères spatiaux."}

#         # 📆 Enregistrement dans la table imported_shapefiles
#         for _, row in filtered_gdf.iterrows():
#             geom_mp = ensure_multipolygon(row.geometry)
#             if geom_mp is None:
#                 continue

#             geom_wkt = WKTElement(geom_mp.wkt, srid=26191)
#             entry = ImportedShapefile(
#                 affaire_id=affaire_id,
#                 file_name=Path(shp_file).name,
#                 geom=geom_wkt
#             )
#             db.add(entry)

#         db.commit()
#         geojson = json.loads(filtered_gdf.to_json())
#         return JSONResponse(content=geojson)

#     except Exception as e:
#         return {"error": f"Erreur lors du traitement : {e}"}
#     finally:
#         # ✅ Nettoyage du dossier "temp/extracted" après traitement
#         try:
#             shutil.rmtree("temp/extracted")
#         except Exception as cleanup_err:
#             print(f"⚠️ Erreur lors du nettoyage : {cleanup_err}")









# Point de terminaison pour vérifier que l'API fonctionne
@app.get("/health")
def health_check():
    return {"status": "OK"}

# Exécution de l'application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)






OUTPUT_FOLDER = "outputs"
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

from shapely.geometry import LineString, mapping
from shapely.ops import split
from shapely import wkt

# Exemple de géométrie découpe (à remplacer par ta géométrie réelle)
# Ici un simple rectangle servant de découpe
from shapely.geometry import box
cutting_geom = box(10, 10, 20, 20)  # xmin, ymin, xmax, ymax


def arc_to_linestring(e, num_segments=36):
    center = e.dxf.center
    radius = e.dxf.radius
    start_angle = e.dxf.start_angle
    end_angle = e.dxf.end_angle

    if end_angle < start_angle:
        end_angle += 360

    angle_range = [start_angle + i * (end_angle - start_angle) / num_segments for i in range(num_segments + 1)]
    return [
        [
            center.x + radius * cos(a * pi / 180),
            center.y + radius * sin(a * pi / 180)
        ] for a in angle_range
    ]



@app.post("/convert-dxf-to-shp/")
async def convert_dxf_to_shp(file: UploadFile = File(...)):
    try:
        dxf_path = os.path.join(OUTPUT_FOLDER, file.filename)
        with open(dxf_path, "wb") as f:
            f.write(await file.read())

        doc = ezdxf.readfile(dxf_path)
        msp = doc.modelspace()
     
        geojson = {
            "type": "FeatureCollection",
            "features": []
        }

        def add_feature(geom_type, coords, layer, properties=None):
            feature = {
                "type": "Feature",
                "properties": {"layer": layer}
            }
            if properties:
                feature["properties"].update(properties)
            feature["geometry"] = {
                "type": geom_type,
                "coordinates": coords
            }
            geojson["features"].append(feature)

        def split_line_into_segments(coords, layer):
            """Découpe une ligne en segments individuels (ligne entre chaque paire de points consécutifs)"""
            for i in range(len(coords) - 1):
                segment_coords = [coords[i], coords[i+1]]
                add_feature("LineString", segment_coords, layer)

        for e in msp:
            dxftype = e.dxftype()
            layer = e.dxf.layer

            try:
                if dxftype == "LINE":
                    start, end = e.dxf.start, e.dxf.end
                    coords = [[start.x, start.y], [end.x, end.y]]
                    # ✅ Appliquer le découpage pour les lignes droites
                    split_line_into_segments(coords, layer)

                elif dxftype in ("LWPOLYLINE", "POLYLINE"):
                    try:
                        from ezdxf.path import make_path

                        path = make_path(e)
                        coords = []
                        for p in path.flattening(0.5):  # tolérance de 0.5 unités
                            coords.append([p[0], p[1]]) 

                        if getattr(e, "closed", False) or getattr(e, "is_closed", False):
                            # Pour les polygones fermés, garder comme polygone
                            coords.append(coords[0])
                            add_feature("Polygon", [coords], layer)
                        else:
                            # ✅ Vérifier si la polyligne contient des arcs
                            has_arcs = False
                            
                            # Vérifier s'il y a des arcs dans la polyligne
                            if hasattr(e, 'vertices_with_bulge'):
                                for vertex in e.vertices_with_bulge():
                                    if len(vertex) > 2 and vertex[2] != 0:  # bulge != 0 indique un arc
                                        has_arcs = True
                                        break
                            elif hasattr(e, '__iter__'):
                                try:
                                    for vertex in e:
                                        if hasattr(vertex, 'bulge') and vertex.bulge != 0:
                                            has_arcs = True
                                            break
                                except:
                                    pass
                            
                            if has_arcs:
                                # ❌ Si contient des arcs, garder comme LineString unique
                                add_feature("LineString", coords, layer)
                            else:
                                # ✅ Si c'est une polyligne droite, appliquer le découpage
                                split_line_into_segments(coords, layer)

                    except Exception as ex:
                        print(f"Erreur dans POLYLINE/LWPOLYLINE avec arcs : {ex}")

                elif dxftype in ("CIRCLE", "ARC"):
                    try:
                        path = make_path(e)
                        coords = []
                        for p in path.flattening(0.5):  # 0.5 = tolérance en unités DXF
                            coords.append([p[0], p[1]])
                        
                        if dxftype == "CIRCLE":
                            coords.append(coords[0])  # fermer le cercle
                            add_feature("Polygon", [coords], layer)
                        else:
                            # ❌ Pour les arcs, NE PAS appliquer le découpage - garder comme LineString unique
                            add_feature("LineString", coords, layer)
                            
                    except Exception as ex:
                        print(f"Erreur lors du traitement de {dxftype} sur le layer {layer} : {ex}")

                elif dxftype == "POINT":
                    p = e.dxf.location
                    add_feature("Point", [p.x, p.y], layer)

                # elif dxftype == "TEXT":
                #     loc = e.dxf.insert
                #     props = {
                #         "label": e.dxf.text,
                #         "height": getattr(e.dxf, "height", 1.0),
                #         "rotation": getattr(e.dxf, "rotation", 0.0),
                #         "h_align": getattr(e.dxf, "halign", 0),
                #         "v_align": getattr(e.dxf, "valign", 0)
                #     }
                #     add_feature("Point", [loc.x, loc.y], "LABEL_TEXT", props)

                elif dxftype == "TEXT":
                    # Le point d'insertion est la base, mais il peut être ajusté par l'alignement
                    loc = e.dxf.insert
                    
                    # Le point d'insertion réel dépend de l'alignement
                    align_point = getattr(e.dxf, "align_point", None)
                    if align_point:
                        loc = align_point

                    props = {
                        "label": e.dxf.text,
                        "height": float(getattr(e.dxf, "height", 1.0)),
                        "rotation": float(getattr(e.dxf, "rotation", 0.0)),
                        "h_align": int(getattr(e.dxf, "halign", 0)),
                        "v_align": int(getattr(e.dxf, "valign", 0)),
                        "style": getattr(e.dxf, "style", None),
                        "extrusion": list(getattr(e.dxf, "extrusion", (0, 0, 1))) # Utile pour la rotation 3D
                    }
                    
                    # Utilisez 'loc' comme point d'insertion final
                    add_feature("Point", [loc.x, loc.y], "LABEL_TEXT", props)
                # elif dxftype == "MTEXT":
                #     loc = e.dxf.insert
                #     props = {
                #         "label": e.text,
                #         "height": getattr(e.dxf, "char_height", 1.0),
                #         "rotation": getattr(e.dxf, "rotation", 0.0),
                #         "width": getattr(e.dxf, "width", None)
                #     }
                #     add_feature("Point", [loc.x, loc.y], "LABEL_MTEXT", props)

                elif dxftype == "MTEXT":
                    loc = e.dxf.insert
                    rotation_vector = getattr(e.dxf, "text_direction", None)
      
                    # Convertir le vecteur de direction du texte en angle de rotation
                    rotation_deg = 0.0
                    if rotation_vector:
                        try:
                            # Calculer l'angle à partir du vecteur de direction
                            rotation_rad = math.atan2(rotation_vector.y, rotation_vector.x)
                            rotation_deg = math.degrees(rotation_rad)
                        except Exception as ex:
                            print(f"Erreur de calcul de rotation pour MTEXT : {ex}")
                    
                    # ezdxf.text peut contenir plusieurs lignes, les fusionner
                    text_content = e.text.replace("\\P", "\n").strip() 

                    props = {
                        "label": text_content,
                        "height": float(getattr(e.dxf, "char_height", 1.0)),
                        # Utiliser la rotation calculée, plus fiable que la propriété 'rotation'
                        "rotation": rotation_deg, 
                        "attachment": int(getattr(e.dxf, "attachment", 1)),
                        "width": float(getattr(e.dxf, "width", 0.0)),
                        "style": getattr(e.dxf, "style", None)
                    }   
                    
                    add_feature("Point", [loc.x, loc.y], "LABEL_MTEXT", props)


            except Exception as ex:
                print(f"Erreur sur l'entité {dxftype} : {ex}")

        return JSONResponse(content=geojson)

    except Exception as e:
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )
    
# fonctionne correctement 

# @app.post("/convert-dxf-to-shp/")
# async def convert_dxf_to_shp(file: UploadFile = File(...)):
#     try:
#         dxf_path = os.path.join(OUTPUT_FOLDER, file.filename)
#         with open(dxf_path, "wb") as f:
#             f.write(await file.read())

#         doc = ezdxf.readfile(dxf_path)
#         msp = doc.modelspace()

#         geojson = {
#             "type": "FeatureCollection",
#             "features": []
#         }

#         def add_feature(geom_type, coords, layer, properties=None):
#             feature = {
#                 "type": "Feature",
#                 "properties": {"layer": layer}
#             }
#             if properties:
#                 feature["properties"].update(properties)
#             feature["geometry"] = {
#                 "type": geom_type,
#                 "coordinates": coords
#             }
#             geojson["features"].append(feature)

#         def split_line_into_segments(coords, layer):
#             for i in range(len(coords) - 1):
#                 add_feature("LineString", [coords[i], coords[i+1]], layer)

    
#         for e in msp:
#             dxftype = e.dxftype()
#             layer = e.dxf.layer

#             try:
#                 if dxftype == "LINE":
#                     start, end = e.dxf.start, e.dxf.end
#                     coords = [[start.x, start.y], [end.x, end.y]]
#                     add_feature("LineString", coords, layer)

#                 # elif dxftype in ("LWPOLYLINE", "POLYLINE"):
#                 #     points = [
#                 #         [p.x, p.y] if hasattr(p, 'x') else [p[0], p[1]]
#                 #         for p in (e.vertices if dxftype == "POLYLINE" else e.get_points())
#                 #     ]
#                 #     if getattr(e, "closed", False) or getattr(e, "is_closed", False):
#                 #         add_feature("Polygon", [points], layer)
#                 #     else:
#                 #         add_feature("LineString", points, layer)

#                 elif dxftype in ("LWPOLYLINE", "POLYLINE"):
#                     try:
#                         from ezdxf.path import make_path

#                         path = make_path(e)
#                         coords = []
#                         for p in path.flattening(0.5):  # tolérance de 0.5 unités
#                             coords.append([p[0], p[1]]) 

#                         if getattr(e, "closed", False) or getattr(e, "is_closed", False):
#                             coords.append(coords[0])
#                             add_feature("Polygon", [coords], layer)
#                         else:
#                             add_feature("LineString", coords, layer)

#                     except Exception as ex:
#                         print(f"Erreur dans POLYLINE/LWPOLYLINE avec arcs : {ex}")

                
#                 elif dxftype in ("CIRCLE", "ARC"):
#                     try:
#                         path = make_path(e)
#                         coords = []
#                         for p in path.flattening(0.5):  # 0.5 = tolérance en unités DXF
#                             coords.append([p[0], p[1]])
#                         if dxftype == "CIRCLE":
#                             coords.append(coords[0])  # fermer le cercle
#                             add_feature("Polygon", [coords], layer)
#                         else:
#                             add_feature("LineString", coords, layer)
#                     except Exception as ex:
#                         print(f"Erreur lors du traitement de {dxftype} sur le layer {layer} : {ex}")

#                 elif dxftype == "POINT":
#                     p = e.dxf.location
#                     add_feature("Point", [p.x, p.y], layer)

#                 elif dxftype == "TEXT":
#                     loc = e.dxf.insert
#                     props = {
#                         "label": e.dxf.text,
#                         "height": getattr(e.dxf, "height", 1.0),
#                         "rotation": getattr(e.dxf, "rotation", 0.0),
#                         "h_align": getattr(e.dxf, "halign", 0),
#                         "v_align": getattr(e.dxf, "valign", 0)
#                     }
#                     add_feature("Point", [loc.x, loc.y], "LABEL_TEXT", props)

#                 elif dxftype == "MTEXT":
#                     loc = e.dxf.insert
#                     props = {
#                         "label": e.text,
#                         "height": getattr(e.dxf, "char_height", 1.0),
#                         "rotation": getattr(e.dxf, "rotation", 0.0),
#                         "width": getattr(e.dxf, "width", None)
#                     }
#                     add_feature("Point", [loc.x, loc.y], "LABEL_MTEXT", props)

#             except Exception as ex:
#                 print(f"Erreur sur l'entité {dxftype} : {ex}")


#         return JSONResponse(content=geojson)

#     except Exception as e:
#         return JSONResponse(
#             content={"error": str(e)},
#             status_code=500
#         )





# @app.post("/convert-dxf-to-shp/")
# async def convert_dxf_to_shp(file: UploadFile = File(...)):
#     try:
#         dxf_path = os.path.join(OUTPUT_FOLDER, file.filename)
#         with open(dxf_path, "wb") as f:
#             f.write(await file.read())

#         doc = ezdxf.readfile(dxf_path)
#         msp = doc.modelspace()

#         geojson = {
#             "type": "FeatureCollection",
#             "features": []
#         }

#         def add_feature(geom_type, coords, layer, properties=None):
#             feature = {
#                 "type": "Feature",
#                 "properties": {"layer": layer}
#             }
#             if properties:
#                 feature["properties"].update(properties)
#             feature["geometry"] = {
#                 "type": geom_type,
#                 "coordinates": coords
#             }
#             geojson["features"].append(feature)

#         def split_line_into_segments(coords, layer):
#             for i in range(len(coords) - 1):
#                 add_feature("LineString", [coords[i], coords[i+1]], layer)

#         for e in msp:
#             dxftype = e.dxftype()
#             layer = e.dxf.layer

#             # if layer in ["CART", "RATTACHEMENT"]:
#             #     continue

#             if dxftype == "LINE":
#                 start, end = e.dxf.start, e.dxf.end
#                 coords = [[start.x, start.y], [end.x, end.y]]
#                 split_line_into_segments(coords, layer)

#             elif dxftype in ("LWPOLYLINE", "POLYLINE"):
#                 points = [
#                     [p.x, p.y] if hasattr(p, 'x') else [p[0], p[1]]
#                     for p in (e.vertices if dxftype == "POLYLINE" else e.get_points())
#                 ]
#                 split_line_into_segments(points, layer)
#                 if getattr(e, "closed", False) or getattr(e, "is_closed", False):
#                     add_feature("Polygon", [points], layer)

#             elif dxftype == "CIRCLE":
#                 center = e.dxf.center
#                 radius = e.dxf.radius
#                 points = [
#                     [
#                         center.x + radius * cos(a),
#                         center.y + radius * sin(a)
#                     ]
#                     for a in [i * 2 * pi / 36 for i in range(37)]  # 36 segments
#                 ]
#                 add_feature("Polygon", [points], layer)

#             # elif dxftype == "ARC":
#             #     center = e.dxf.center
#             #     radius = e.dxf.radius
#             #     start_angle = e.dxf.start_angle
#             #     end_angle = e.dxf.end_angle

#             #     if end_angle < start_angle:
#             #         end_angle += 360

#             #     angles = [start_angle + i * (end_angle - start_angle) / 36 for i in range(37)]
#             #     points = [
#             #         [
#             #             center.x + radius * cos(a * pi / 180),
#             #             center.y + radius * sin(a * pi / 180)
#             #         ]
#             #         for a in angles
#             #     ]
#             #     add_feature("LineString", points, layer)
            

#             elif dxftype == "ARC":
#                 center = e.dxf.center
#                 radius = e.dxf.radius
#                 start_angle = e.dxf.start_angle
#                 end_angle = e.dxf.end_angle

#                 if end_angle < start_angle:
#                     end_angle += 360

#                 angles = [start_angle + i * (end_angle - start_angle) / 36 for i in range(37)]
#                 points = [
#                     [
#                         center.x + radius * cos(a * pi / 180),
#                         center.y + radius * sin(a * pi / 180)
#                     ]
#                     for a in angles
#                 ]

#                 # Créer une seule LineString pour l'arc au lieu de segments séparés
#                 add_feature("LineString", points, layer)

#             elif dxftype == "POINT":
#                 p = e.dxf.location
#                 add_feature("Point", [p.x, p.y], layer)

#             elif dxftype == "TEXT":
#                 loc = e.dxf.insert
#                 props = {
#                     "label": e.dxf.text,
#                     "height": getattr(e.dxf, "height", 1.0),
#                     "rotation": getattr(e.dxf, "rotation", 0.0),
#                     "h_align": getattr(e.dxf, "halign", 0),
#                     "v_align": getattr(e.dxf, "valign", 0)
#                 }
#                 add_feature("Point", [loc.x, loc.y], "LABEL_TEXT", props)

#             elif dxftype == "MTEXT":
#                 loc = e.dxf.insert
#                 props = {
#                     "label": e.text,
#                     "height": getattr(e.dxf, "char_height", 1.0),
#                     "rotation": getattr(e.dxf, "rotation", 0.0),
#                     "width": getattr(e.dxf, "width", None)
#                 }
#                 add_feature("Point", [loc.x, loc.y], "LABEL_MTEXT", props)

#         return JSONResponse(content=geojson)

#     except Exception as e:
#         return JSONResponse(
#             content={"error": str(e)},
#             status_code=500
#         )





def format_date_fr(datemec) -> str:
    mois_fr = {
        1: "Janvier",
        2: "Février",
        3: "Mars",
        4: "Avril",
        5: "Mai",
        6: "Juin",
        7: "Juillet",
        8: "Août",
        9: "Septembre",
        10: "Octobre",
        11: "Novembre",
        12: "Décembre"
    }
    try:
        if isinstance(datemec, (datetime, date)):
            dt = datemec
        else:
            dt = datetime.strptime(str(datemec), "%Y-%m-%d")

        jour = dt.day
        mois = mois_fr.get(dt.month, "")
        annee = dt.year

        if mois:
            return f"{jour} {mois} {annee}"
        else:
            return str(datemec)
    except Exception:
        return str(datemec)






# latest_uploaded_dxf_path: str | None = None
# latest_modified_dxf_path: str | None = None

@app.post("/convert-dxf-to-shp-mec-direct/")
async def convert_dxf_to_shp_mec_direct(
    affaire_id: int = Form(...), 
    IGT: str = Form(...),
    ville: str = Form(...)
):
    global latest_uploaded_dxf_path, latest_modified_dxf_path
    try:
        dxf_input_path = os.path.join("outputs", "dossier_mec", "Chemise_verte.dxf")
        if not os.path.exists(dxf_input_path):
            return JSONResponse(content={"error": "Fichier DXF source non trouvé."}, status_code=404)

        uid = uuid.uuid4().hex
        dxf_output_path = os.path.join("outputs", f"modified_{uid}.dxf")

        latest_uploaded_dxf_path = dxf_input_path

        dxf_output_path = os.path.join(OUTPUT_FOLDER, f"modified_{uid}.dxf")
    
        # Écrire le fichier DXF uploadé
        # with open(dxf_input_path, "wb") as f:
        #     content = await file.read()
        #     f.write(content)
        # print(f"[INFO] Fichier sauvegardé à : {dxf_input_path}")

        # Lecture DXF avec gestion d'erreurs
        try:
            doc = ezdxf.readfile(dxf_input_path)
            print("[INFO] DXF lu avec succès.")
        except IOError:
            print("[ERREUR] Impossible de lire le fichier DXF.")
            return JSONResponse(content={"error": "Impossible de lire le fichier DXF."}, status_code=400)
        except ezdxf.DXFStructureError as e:
            print(f"[ERREUR] Structure DXF invalide : {e}")
            return JSONResponse(content={"error": f"Structure DXF invalide : {str(e)}"}, status_code=400)
        except Exception as e:
            print(f"[ERREUR] Exception inattendue lors de la lecture DXF : {e}")
            traceback.print_exc()
            return JSONResponse(content={"error": f"Erreur lecture DXF : {str(e)}"}, status_code=500)

        msp = doc.modelspace()
        print(f"[INFO] Nombre d'entités dans le modelspace : {len(msp)}")
        if len(msp) == 0:
            print("[AVERTISSEMENT] Le modelspace est vide.")
            return JSONResponse(content={"error": "Le fichier DXF ne contient aucune entité."}, status_code=400)

        # Connexion base de données et récupération affaire
        db: Session = SessionLocal()
        affaire = db.query(Affaire).filter(Affaire.id == affaire_id).first()
        if not affaire:
            print("[ERREUR] Affaire introuvable.")
            return JSONResponse(content={"error": "Affaire introuvable."}, status_code=404)

        images = db.query(Image).filter(Image.affaire_id == affaire_id).all()

        datemec_fr = format_date_fr(affaire.datemec) if affaire.datemec else ""
        a_le = f"A {ville or ''} le {datemec_fr}".strip()

        remplacement_labels = {
            "Titre: ........": affaire.titremec or "",
            "Titre Foncier :........................": affaire.titremec or "",
            "Propriété dite": affaire.proprietefr or "",
            "SD N°": affaire.numerosd or "",
            "Etabli par L'I.G.T": IGT or "",
            "IGT": IGT or "",
            "de.": affaire.servicecadastre or "",
            "A ................................. le .........................": a_le,
            "Mappe": affaire.mappecadre or "" ,
            "Service du Cadastre De ": affaire.servicecadastre or "",
            # "Service du Cadastre": affaire.servicecadastre or "",
            "Située à": ville or '',
            "Etabli en": datemec_fr,
            "SD": affaire.numerosd or "",
        }

        # geojson = {"type": "FeatureCollection", "features": []}
        # image_type_coords = {}

        # def add_feature(geom_type, coords, layer, properties=None):
        #     feature = {
        #         "type": "Feature",
        #         "properties": {"layer": layer},
        #         "geometry": {"type": geom_type, "coordinates": coords}
        #     }
        #     if properties:
        #         feature["properties"].update(properties)
        #     geojson["features"].append(feature)

        # def split_line_into_segments(coords, layer):
        #     for i in range(len(coords) - 1):
        #         add_feature("LineString", [coords[i], coords[i + 1]], layer)

        def remplacer_label(original: str):
            original = original.strip()
            for key, value in remplacement_labels.items():
                if original.startswith(key):
                    if key == "Service du Cadastre De ":
                        return f"{key} {value}", key
                    elif key == "de.":
                        return f"de {value}", key
                    elif key == "A ................................. le .........................":
                        return f"{value}", key
                    elif key == "Titre Foncier :........................":
                        return f"Titre Foncier : {value}", key
                    elif key == "Titre: ........":
                        return f"Titre : {value}", key
                    elif key == "Mappe":
                        return f"Mappe: {affaire.mappecadre or 'map 15'}  au  {affaire.consistance or ''}", key
                    else:
                        return f"{key}: {value}", key
            return original, None

        # Parcours pour analyse & GeoJSON
        for e in msp:
            dxftype = e.dxftype()
            # layer = e.dxf.layer

            # if dxftype == "LINE":
            #     start, end = e.dxf.start, e.dxf.end
            #     split_line_into_segments([[start.x, start.y], [end.x, end.y]], layer)

            # elif dxftype in ("LWPOLYLINE", "POLYLINE"):
            #     points = [[p.x, p.y] if hasattr(p, 'x') else [p[0], p[1]]
            #               for p in (e.vertices if dxftype == "POLYLINE" else e.get_points())]
            #     split_line_into_segments(points, layer)
            #     if getattr(e, "closed", False) or getattr(e, "is_closed", False):
            #         add_feature("Polygon", [points], layer)

            # elif dxftype == "CIRCLE":
            #     center, radius = e.dxf.center, e.dxf.radius
            #     points = [[center.x + radius * cos(a), center.y + radius * sin(a)]
            #               for a in [i * 2 * pi / 36 for i in range(37)]]
            #     add_feature("Polygon", [points], layer)

            # elif dxftype == "POINT":
            #     p = e.dxf.location
            #     add_feature("Point", [p.x, p.y], layer)

            # if dxftype == "TEXT":
            #     loc = e.dxf.insert
            #     original_label = e.dxf.text.strip()
            #     new_label, _ = remplacer_label(original_label)
            #     if original_label.lower() in ["façade", "façade principale"]:
            #         image_type_coords["façade"] = (loc.x, loc.y)
            #     props = {
            #         "label": new_label,
            #         "original": original_label,
            #         "height": getattr(e.dxf, "height", 1.0),
            #         "rotation": getattr(e.dxf, "rotation", 0.0)
            #     }
            #     add_feature("Point", [loc.x, loc.y], "LABEL_TEXT", props)

            # elif dxftype == "MTEXT":
            #     loc = e.dxf.insert
            #     original_label = e.text.strip()
            #     new_label, _ = remplacer_label(original_label)
            #     if original_label.lower() in ["façade", "façade principale"]:
            #         image_type_coords["façade"] = (loc.x, loc.y)
            #     props = {
            #         "label": new_label,
            #         "original": original_label,
            #         "height": getattr(e.dxf, "char_height", 1.0),
            #         "rotation": getattr(e.dxf, "rotation", 0.0)
            #     }
            #     add_feature("Point", [loc.x, loc.y], "LABEL_MTEXT", props)

        # **Modification réelle des textes dans le DXF pour qu'ils soient pris en compte dans le fichier final**
        for e in msp:
            dxftype = e.dxftype()
            if dxftype == "TEXT":
                original_label = e.dxf.text.strip()
                new_label, _ = remplacer_label(original_label)
                if new_label != original_label:
                    print(f"[MODIF] Texte TEXT modifié: '{original_label}' -> '{new_label}'")
                    e.dxf.text = new_label
            elif dxftype == "MTEXT":
                original_label = e.text.strip()
                new_label, _ = remplacer_label(original_label)
                if new_label != original_label:
                    print(f"[MODIF] Texte MTEXT modifié: '{original_label}' -> '{new_label}'")
                    e.text = new_label

        # # Ajout images dans DXF et GeoJSON
        # for img in images:
        #     coords = [0.0, 0.0]
        #     if img.type and img.type.lower() in image_type_coords:
        #         coords = list(image_type_coords[img.type.lower()])
        #     add_feature("Point", coords, "IMAGE", {
        #         "image_url": "/uploads/" + os.path.basename(img.file_path),
        #         "type": img.type,
        #         "image_id": img.id
        #     })
        #     msp.add_point((coords[0], coords[1], 0), dxfattribs={"layer": "IMAGE"})

        # Sauvegarde fichier DXF modifié
        doc.saveas(dxf_output_path)
        print(f"[INFO] Fichier DXF modifié sauvegardé à: {dxf_output_path}")
        latest_modified_dxf_path = dxf_output_path
        # Créer le PDF
        pdf_output_path = os.path.join(OUTPUT_FOLDER, f"MEC_{uid}.pdf")
        create_dxf_structure_pdf(doc, msp, pdf_output_path, affaire)
        print(f"[INFO] PDF Chemise vert  généré : {pdf_output_path}")
 
        # Retourner le PDF
        return FileResponse(
            path=pdf_output_path,
            media_type="application/pdf",
            filename=f"MEC_{affaire_id}_{datetime.now().strftime('%Y%m%d')}.pdf",
            headers={"Content-Disposition": f"attachment; filename=MEC_{affaire_id}_{datetime.now().strftime('%Y%m%d')}.pdf"}
        )
        # return JSONResponse(content=geojson)

    except Exception as e:
        print("[ERREUR GÉNÉRALE] Erreur inattendue :")
        traceback.print_exc()
        return JSONResponse(content={"error": f"Erreur lors de la conversion DXF : {str(e)}"}, status_code=500)








@app.post("/convert-dxf-to-shp-mec-direct-montage/")
async def convert_dxf_to_shp_mec_direct_montage(
    affaire_id: int = Form(...), 
    IGT: str = Form(...),
    ville: str = Form(...),
    adresse: str = Form(...),
    tele: str = Form(...),
    email: str = Form(...)
):
    global latest_uploaded_dxf_path, latest_modified_dxf_path
    try:
        dxf_input_path = os.path.join("outputs", "dossier_mec", "Montage_des_photos.dxf")
        if not os.path.exists(dxf_input_path):
            return JSONResponse(content={"error": "Fichier DXF source non trouvé."}, status_code=404)

        uid = uuid.uuid4().hex
        dxf_output_path = os.path.join("outputs", f"modified_{uid}.dxf")

        latest_uploaded_dxf_path = dxf_input_path

        dxf_output_path = os.path.join(OUTPUT_FOLDER, f"modified_{uid}.dxf")
    
        # Écrire le fichier DXF uploadé
        # with open(dxf_input_path, "wb") as f:
        #     content = await file.read()
        #     f.write(content)
        # print(f"[INFO] Fichier sauvegardé à : {dxf_input_path}")

        # Lecture DXF avec gestion d'erreurs
        try:
            doc = ezdxf.readfile(dxf_input_path)
            print("[INFO] DXF lu avec succès.")
        except IOError:
            print("[ERREUR] Impossible de lire le fichier DXF.")
            return JSONResponse(content={"error": "Impossible de lire le fichier DXF."}, status_code=400)
        except ezdxf.DXFStructureError as e:
            print(f"[ERREUR] Structure DXF invalide : {e}")
            return JSONResponse(content={"error": f"Structure DXF invalide : {str(e)}"}, status_code=400)
        except Exception as e:
            print(f"[ERREUR] Exception inattendue lors de la lecture DXF : {e}")
            traceback.print_exc()
            return JSONResponse(content={"error": f"Erreur lecture DXF : {str(e)}"}, status_code=500)

        msp = doc.modelspace()
        print(f"[INFO] Nombre d'entités dans le modelspace : {len(msp)}")
        if len(msp) == 0:
            print("[AVERTISSEMENT] Le modelspace est vide.")
            return JSONResponse(content={"error": "Le fichier DXF ne contient aucune entité."}, status_code=400)

        # Connexion base de données et récupération affaire
        db: Session = SessionLocal()
        affaire = db.query(Affaire).filter(Affaire.id == affaire_id).first()
        if not affaire:
            print("[ERREUR] Affaire introuvable.")
            return JSONResponse(content={"error": "Affaire introuvable."}, status_code=404)

        images = db.query(Image).filter(Image.affaire_id == affaire_id).all()

        datemec_fr = format_date_fr(affaire.datemec) if affaire.datemec else ""
        a_le = f"A {ville or ''} le {datemec_fr}".strip()

        remplacement_labels = {
            "Titre: ........": affaire.titremec or "",
            "Titre Foncier :........................": affaire.titremec or "",
            "Propriété dite": affaire.proprietefr or "",
            "SD N°": affaire.numerosd or "",
            "Etabli par L'I.G.T": IGT or "",
            "IGT": IGT or "",
            "de.": affaire.servicecadastre or "",
            "A ................................. le .........................": a_le,
            "Mappe": affaire.mappecadre or "" ,
            "Service du Cadastre De ": affaire.servicecadastre or "",
            # "Service du Cadastre": affaire.servicecadastre or "",
            "Située à": ville or '',
            "Etabli en": datemec_fr,
            "SD": affaire.numerosd or "",
        }

        # geojson = {"type": "FeatureCollection", "features": []}
        # image_type_coords = {}

        # def add_feature(geom_type, coords, layer, properties=None):
        #     feature = {
        #         "type": "Feature",
        #         "properties": {"layer": layer},
        #         "geometry": {"type": geom_type, "coordinates": coords}
        #     }
        #     if properties:
        #         feature["properties"].update(properties)
        #     geojson["features"].append(feature)

        # def split_line_into_segments(coords, layer):
        #     for i in range(len(coords) - 1):
        #         add_feature("LineString", [coords[i], coords[i + 1]], layer)

        def remplacer_label(original: str):
            original = original.strip()
            for key, value in remplacement_labels.items():
                if original.startswith(key):
                    if key == "Service du Cadastre De ":
                        return f"{key} {value}", key
                    elif key == "de.":
                        return f"de {value}", key
                    elif key == "A ................................. le .........................":
                        return f"{value}", key
                    elif key == "Titre Foncier :........................":
                        return f"Titre Foncier : {value}", key
                    elif key == "Titre: ........":
                        return f"Titre : {value}", key
                    elif key == "Mappe":
                        return f"Mappe: {affaire.mappecadre or 'map 15'}  au  {affaire.consistance or ''}", key
                    else:
                        return f"{key}: {value}", key
            return original, None

        # Parcours pour analyse & GeoJSON
        for e in msp:
            dxftype = e.dxftype()
            # layer = e.dxf.layer

            # if dxftype == "LINE":
            #     start, end = e.dxf.start, e.dxf.end
            #     split_line_into_segments([[start.x, start.y], [end.x, end.y]], layer)

            # elif dxftype in ("LWPOLYLINE", "POLYLINE"):
            #     points = [[p.x, p.y] if hasattr(p, 'x') else [p[0], p[1]]
            #               for p in (e.vertices if dxftype == "POLYLINE" else e.get_points())]
            #     split_line_into_segments(points, layer)
            #     if getattr(e, "closed", False) or getattr(e, "is_closed", False):
            #         add_feature("Polygon", [points], layer)

            # elif dxftype == "CIRCLE":
            #     center, radius = e.dxf.center, e.dxf.radius
            #     points = [[center.x + radius * cos(a), center.y + radius * sin(a)]
            #               for a in [i * 2 * pi / 36 for i in range(37)]]
            #     add_feature("Polygon", [points], layer)

            # elif dxftype == "POINT":
            #     p = e.dxf.location
            #     add_feature("Point", [p.x, p.y], layer)

            # if dxftype == "TEXT":
            #     loc = e.dxf.insert
            #     original_label = e.dxf.text.strip()
            #     new_label, _ = remplacer_label(original_label)
            #     if original_label.lower() in ["façade", "façade principale"]:
            #         image_type_coords["façade"] = (loc.x, loc.y)
            #     props = {
            #         "label": new_label,
            #         "original": original_label,
            #         "height": getattr(e.dxf, "height", 1.0),
            #         "rotation": getattr(e.dxf, "rotation", 0.0)
            #     }
            #     add_feature("Point", [loc.x, loc.y], "LABEL_TEXT", props)

            # elif dxftype == "MTEXT":
            #     loc = e.dxf.insert
            #     original_label = e.text.strip()
            #     new_label, _ = remplacer_label(original_label)
            #     if original_label.lower() in ["façade", "façade principale"]:
            #         image_type_coords["façade"] = (loc.x, loc.y)
            #     props = {
            #         "label": new_label,
            #         "original": original_label,
            #         "height": getattr(e.dxf, "char_height", 1.0),
            #         "rotation": getattr(e.dxf, "rotation", 0.0)
            #     }
            #     add_feature("Point", [loc.x, loc.y], "LABEL_MTEXT", props)

        # **Modification réelle des textes dans le DXF pour qu'ils soient pris en compte dans le fichier final**
        for e in msp:
            dxftype = e.dxftype()
            if dxftype == "TEXT":
                original_label = e.dxf.text.strip()
                new_label, _ = remplacer_label(original_label)
                if new_label != original_label:
                    print(f"[MODIF] Texte TEXT modifié: '{original_label}' -> '{new_label}'")
                    e.dxf.text = new_label
            elif dxftype == "MTEXT":
                original_label = e.text.strip()
                new_label, _ = remplacer_label(original_label)
                if new_label != original_label:
                    print(f"[MODIF] Texte MTEXT modifié: '{original_label}' -> '{new_label}'")
                    e.text = new_label

        # # Ajout images dans DXF et GeoJSON
        # for img in images:
        #     coords = [0.0, 0.0]
        #     if img.type and img.type.lower() in image_type_coords:
        #         coords = list(image_type_coords[img.type.lower()])
        #     add_feature("Point", coords, "IMAGE", {
        #         "image_url": "/uploads/" + os.path.basename(img.file_path),
        #         "type": img.type,
        #         "image_id": img.id
        #     })
        #     msp.add_point((coords[0], coords[1], 0), dxfattribs={"layer": "IMAGE"})

        # Sauvegarde fichier DXF modifié
        doc.saveas(dxf_output_path)
        print(f"[INFO] Fichier DXF modifié sauvegardé à: {dxf_output_path}")
        latest_modified_dxf_path = dxf_output_path
        # Créer le PDF
        pdf_output_path = os.path.join(OUTPUT_FOLDER, f"MEC_{uid}.pdf")
        create_montage_photos_pdf(
            doc, msp, pdf_output_path, affaire, images, IGT, adresse, tele, email, ville
        )
        print(f"[INFO] PDF Montage Photos généré : {pdf_output_path}")
 
        # Retourner le PDF
        return FileResponse(
            path=pdf_output_path,
            media_type="application/pdf",
            filename=f"MEC_{affaire_id}_{datetime.now().strftime('%Y%m%d')}.pdf",
            headers={"Content-Disposition": f"attachment; filename=MEC_{affaire_id}_{datetime.now().strftime('%Y%m%d')}.pdf"}
        )
        # return JSONResponse(content=geojson)

    except Exception as e:
        print("[ERREUR GÉNÉRALE] Erreur inattendue :")
        traceback.print_exc()
        return JSONResponse(content={"error": f"Erreur lors de la conversion DXF : {str(e)}"}, status_code=500)







# latest_uploaded_dxf_path: str | None = None
# latest_modified_dxf_path: str | None = None

# @app.post("/convert-dxf-to-shp-mec/")
# async def convert_dxf_to_shp_mec(
#     file: UploadFile = File(...),
#     affaire_id: int = Form(...), 
#     IGT: str = Form(...),
#     ville: str = Form(...)
# ):
#     global latest_uploaded_dxf_path, latest_modified_dxf_path
#     try:
#         print(f"[INFO] Réception du fichier : {file.filename}")
#         uid = uuid.uuid4().hex
#         dxf_input_path = os.path.join(OUTPUT_FOLDER, f"in_{uid}.dxf")
       
#         latest_uploaded_dxf_path = dxf_input_path 
#         dxf_output_path = os.path.join(OUTPUT_FOLDER, f"modified_{uid}.dxf")
    
#         # Écrire le fichier DXF uploadé
#         with open(dxf_input_path, "wb") as f:
#             content = await file.read()
#             f.write(content)
#         print(f"[INFO] Fichier sauvegardé à : {dxf_input_path}")

#         # Lecture DXF avec gestion d'erreurs
#         try:
#             doc = ezdxf.readfile(dxf_input_path)
#             print("[INFO] DXF lu avec succès.")
#         except IOError:
#             print("[ERREUR] Impossible de lire le fichier DXF.")
#             return JSONResponse(content={"error": "Impossible de lire le fichier DXF."}, status_code=400)
#         except ezdxf.DXFStructureError as e:
#             print(f"[ERREUR] Structure DXF invalide : {e}")
#             return JSONResponse(content={"error": f"Structure DXF invalide : {str(e)}"}, status_code=400)
#         except Exception as e:
#             print(f"[ERREUR] Exception inattendue lors de la lecture DXF : {e}")
#             traceback.print_exc()
#             return JSONResponse(content={"error": f"Erreur lecture DXF : {str(e)}"}, status_code=500)

#         msp = doc.modelspace()
#         print(f"[INFO] Nombre d'entités dans le modelspace : {len(msp)}")
#         if len(msp) == 0:
#             print("[AVERTISSEMENT] Le modelspace est vide.")
#             return JSONResponse(content={"error": "Le fichier DXF ne contient aucune entité."}, status_code=400)

#         # Connexion base de données et récupération affaire
#         db: Session = SessionLocal()
#         affaire = db.query(Affaire).filter(Affaire.id == affaire_id).first()
#         if not affaire:
#             print("[ERREUR] Affaire introuvable.")
#             return JSONResponse(content={"error": "Affaire introuvable."}, status_code=404)

#         images = db.query(Image).filter(Image.affaire_id == affaire_id).all()

#         datemec_fr = format_date_fr(affaire.datemec) if affaire.datemec else ""
#         a_le = f"A {ville or ''} le {datemec_fr}".strip()

#         remplacement_labels = {
#             "Titre: ........": affaire.titremec or "",
#             "Titre Foncier :........................": affaire.titremec or "",
#             "Propriété dite": affaire.proprietefr or "",
#             "SD N°": affaire.numerosd or "",
#             "Etabli par L'I.G.T": IGT or "",
#             "IGT": IGT or "",
#             "de.": affaire.servicecadastre or "",
#             "A ................................. le .........................": a_le,
#             "Mappe": affaire.mappecadre or "" ,
#             "Service du Cadastre De ": affaire.servicecadastre or "",
#             # "Service du Cadastre": affaire.servicecadastre or "",
#             "Située à": ville or '',
#             "Etabli en": datemec_fr,
#             "SD": affaire.numerosd or "",
#         }

#         geojson = {"type": "FeatureCollection", "features": []}
#         image_type_coords = {}

#         def add_feature(geom_type, coords, layer, properties=None):
#             feature = {
#                 "type": "Feature",
#                 "properties": {"layer": layer},
#                 "geometry": {"type": geom_type, "coordinates": coords}
#             }
#             if properties:
#                 feature["properties"].update(properties)
#             geojson["features"].append(feature)

#         def split_line_into_segments(coords, layer):
#             for i in range(len(coords) - 1):
#                 add_feature("LineString", [coords[i], coords[i + 1]], layer)

#         def remplacer_label(original: str):
#             original = original.strip()
#             for key, value in remplacement_labels.items():
#                 if original.startswith(key):
#                     if key == "Service du Cadastre De ":
#                         return f"{key} {value}", key
#                     elif key == "de.":
#                         return f"de {value}", key
#                     elif key == "A ................................. le .........................":
#                         return f"{value}", key
#                     elif key == "Titre Foncier :........................":
#                         return f"Titre Foncier : {value}", key
#                     elif key == "Titre: ........":
#                         return f"Titre : {value}", key
#                     elif key == "Mappe":
#                         return f"Mappe: {affaire.mappecadre or 'map 15'}  au  {affaire.consistance or ''}", key
#                     else:
#                         return f"{key}: {value}", key
#             return original, None

#         # Parcours pour analyse & GeoJSON
#         for e in msp:
#             dxftype = e.dxftype()
#             layer = e.dxf.layer

#             if dxftype == "LINE":
#                 start, end = e.dxf.start, e.dxf.end
#                 split_line_into_segments([[start.x, start.y], [end.x, end.y]], layer)

#             elif dxftype in ("LWPOLYLINE", "POLYLINE"):
#                 points = [[p.x, p.y] if hasattr(p, 'x') else [p[0], p[1]]
#                           for p in (e.vertices if dxftype == "POLYLINE" else e.get_points())]
#                 split_line_into_segments(points, layer)
#                 if getattr(e, "closed", False) or getattr(e, "is_closed", False):
#                     add_feature("Polygon", [points], layer)

#             elif dxftype == "CIRCLE":
#                 center, radius = e.dxf.center, e.dxf.radius
#                 points = [[center.x + radius * cos(a), center.y + radius * sin(a)]
#                           for a in [i * 2 * pi / 36 for i in range(37)]]
#                 add_feature("Polygon", [points], layer)

#             elif dxftype == "POINT":
#                 p = e.dxf.location
#                 add_feature("Point", [p.x, p.y], layer)

#             elif dxftype == "TEXT":
#                 loc = e.dxf.insert
#                 original_label = e.dxf.text.strip()
#                 new_label, _ = remplacer_label(original_label)
#                 if original_label.lower() in ["façade", "façade principale"]:
#                     image_type_coords["façade"] = (loc.x, loc.y)
#                 props = {
#                     "label": new_label,
#                     "original": original_label,
#                     "height": getattr(e.dxf, "height", 1.0),
#                     "rotation": getattr(e.dxf, "rotation", 0.0)
#                 }
#                 add_feature("Point", [loc.x, loc.y], "LABEL_TEXT", props)

#             elif dxftype == "MTEXT":
#                 loc = e.dxf.insert
#                 original_label = e.text.strip()
#                 new_label, _ = remplacer_label(original_label)
#                 if original_label.lower() in ["façade", "façade principale"]:
#                     image_type_coords["façade"] = (loc.x, loc.y)
#                 props = {
#                     "label": new_label,
#                     "original": original_label,
#                     "height": getattr(e.dxf, "char_height", 1.0),
#                     "rotation": getattr(e.dxf, "rotation", 0.0)
#                 }
#                 add_feature("Point", [loc.x, loc.y], "LABEL_MTEXT", props)

#         # **Modification réelle des textes dans le DXF pour qu'ils soient pris en compte dans le fichier final**
#         for e in msp:
#             dxftype = e.dxftype()
#             if dxftype == "TEXT":
#                 original_label = e.dxf.text.strip()
#                 new_label, _ = remplacer_label(original_label)
#                 if new_label != original_label:
#                     print(f"[MODIF] Texte TEXT modifié: '{original_label}' -> '{new_label}'")
#                     e.dxf.text = new_label
#             elif dxftype == "MTEXT":
#                 original_label = e.text.strip()
#                 new_label, _ = remplacer_label(original_label)
#                 if new_label != original_label:
#                     print(f"[MODIF] Texte MTEXT modifié: '{original_label}' -> '{new_label}'")
#                     e.text = new_label

#         # # Ajout images dans DXF et GeoJSON
#         # for img in images:
#         #     coords = [0.0, 0.0]
#         #     if img.type and img.type.lower() in image_type_coords:
#         #         coords = list(image_type_coords[img.type.lower()])
#         #     add_feature("Point", coords, "IMAGE", {
#         #         "image_url": "/uploads/" + os.path.basename(img.file_path),
#         #         "type": img.type,
#         #         "image_id": img.id
#         #     })
#         #     msp.add_point((coords[0], coords[1], 0), dxfattribs={"layer": "IMAGE"})

#         # Sauvegarde fichier DXF modifié
#         doc.saveas(dxf_output_path)
#         print(f"[INFO] Fichier DXF modifié sauvegardé à: {dxf_output_path}")
#         latest_modified_dxf_path = dxf_output_path

#         return JSONResponse(content=geojson)

#     except Exception as e:
#         print("[ERREUR GÉNÉRALE] Erreur inattendue :")
#         traceback.print_exc()
#         return JSONResponse(content={"error": f"Erreur lors de la conversion DXF : {str(e)}"}, status_code=500)


@app.post("/export-dxf-as-pdf/")
async def export_dxf_as_pdf(affaire_id: int = Form(...)):
    try:
        global latest_modified_dxf_path
        if not latest_modified_dxf_path or not os.path.isfile(latest_modified_dxf_path):
            return JSONResponse(status_code=404, content={"error": "Aucun fichier DXF modifié disponible."})

        uid = uuid.uuid4().hex
        pdf_output_path = os.path.join(OUTPUT_FOLDER, f"MEC_{uid}.pdf")

        # Lire le fichier DXF modifié
        doc = readfile(latest_modified_dxf_path)
        msp = doc.modelspace()
        print("[INFO] Lecture DXF modifié OK")

        # Récupérer l'affaire depuis la BDD
        db: Session = SessionLocal()
        try:
            affaire = db.query(Affaire).filter(Affaire.id == affaire_id).first()
            if not affaire:
                return JSONResponse(status_code=404, content={"error": "Affaire introuvable."})
            
            images = db.query(Image).filter(Image.affaire_id == affaire_id).all()
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": f"Erreur BDD: {e}"})
        finally:
            db.close()

        # Générer le PDF avec la structure DXF exacte
        create_dxf_structure_pdf(doc, msp, pdf_output_path, affaire)
        print(f"[INFO] PDF avec structure DXF généré à : {pdf_output_path}")

        # Envoyer le fichier PDF
        return FileResponse(
            path=pdf_output_path,
            media_type="application/pdf",
            filename=f"MEC_{affaire_id}_{datetime.now().strftime('%Y%m%d')}.pdf",
            headers={"Content-Disposition": f"attachment; filename=MEC_{affaire_id}_{datetime.now().strftime('%Y%m%d')}.pdf"}
        )

    except Exception as e: 
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

def create_dxf_structure_pdf(doc, msp, pdf_output_path, affaire):
    """
    Génération PDF format officiel MEC avec contenu DXF intégré dans une seule page
    Optimisé pour utiliser tout l'espace A4 disponible
    """
    width, height = A4
    c = canvas.Canvas(pdf_output_path, pagesize=A4)
    
    # ========== PAGE UNIQUE: FORMAT OFFICIEL MEC AVEC DXF INTÉGRÉ ==========
    draw_official_mec_with_dxf(c, width, height, affaire, msp)
    
    print(f"[INFO] Création PDF avec structure DXF - Entités dans modelspace: {len(list(msp))}")
    
    # Analyser toutes les entités du DXF pour calculer les limites
    entities_data = []
    min_x = min_y = float('inf')
    max_x = max_y = float('-inf')
    
    for e in msp:
        dxftype = e.dxftype()
        layer = e.dxf.layer
        
        if dxftype == "LINE":
            start, end = e.dxf.start, e.dxf.end
            entities_data.append({
                'type': 'LINE',
                'layer': layer,
                'start': (start.x, start.y),
                'end': (end.x, end.y),
                'color': getattr(e.dxf, 'color', 7)
            })
            min_x = min(min_x, start.x, end.x)
            max_x = max(max_x, start.x, end.x)
            min_y = min(min_y, start.y, end.y)
            max_y = max(max_y, start.y, end.y)
            
        elif dxftype in ("LWPOLYLINE", "POLYLINE"):
            points = []
            for p in (e.vertices if dxftype == "POLYLINE" else e.get_points()):
                if hasattr(p, 'x'):
                    points.append((p.x, p.y))
                else:
                    points.append((p[0], p[1]))
            
            entities_data.append({
                'type': 'POLYLINE',
                'layer': layer,
                'points': points,
                'closed': getattr(e, "closed", False) or getattr(e, "is_closed", False),
                'color': getattr(e.dxf, 'color', 7)
            })
            
            for x, y in points:
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)
                
        elif dxftype == "CIRCLE":
            center, radius = e.dxf.center, e.dxf.radius
            entities_data.append({
                'type': 'CIRCLE',
                'layer': layer,
                'center': (center.x, center.y),
                'radius': radius,
                'color': getattr(e.dxf, 'color', 7)
            })
            min_x = min(min_x, center.x - radius)
            max_x = max(max_x, center.x + radius)
            min_y = min(min_y, center.y - radius)
            max_y = max(max_y, center.y + radius)
            
        elif dxftype == "ARC":
            center = e.dxf.center
            radius = e.dxf.radius
            start_angle = e.dxf.start_angle
            end_angle = e.dxf.end_angle
            entities_data.append({
                'type': 'ARC',
                'layer': layer,
                'center': (center.x, center.y),
                'radius': radius,
                'start_angle': start_angle,
                'end_angle': end_angle,
                'color': getattr(e.dxf, 'color', 7)
            })
            min_x = min(min_x, center.x - radius)
            max_x = max(max_x, center.x + radius)
            min_y = min(min_y, center.y - radius)
            max_y = max(max_y, center.y + radius)
            
        elif dxftype == "POINT":
            p = e.dxf.location
            entities_data.append({
                'type': 'POINT',
                'layer': layer,
                'location': (p.x, p.y),
                'color': getattr(e.dxf, 'color', 7)
            })
            min_x = min(min_x, p.x)
            max_x = max(max_x, p.x)
            min_y = min(min_y, p.y)
            max_y = max(max_y, p.y)
            
        elif dxftype == "TEXT":
            loc = e.dxf.insert
            text_content = e.dxf.text
            height_val = getattr(e.dxf, "height", 1.0)
            rotation = getattr(e.dxf, "rotation", 0.0)
            
            entities_data.append({
                'type': 'TEXT',
                'layer': layer,
                'location': (loc.x, loc.y),
                'text': text_content,
                'height': height_val,
                'rotation': rotation,
                'color': getattr(e.dxf, 'color', 7)
            })
            min_x = min(min_x, loc.x)
            max_x = max(max_x, loc.x)
            min_y = min(min_y, loc.y)
            max_y = max(max_y, loc.y)
            
        # elif dxftype == "MTEXT":
        #     loc = e.dxf.insert
        #     text_content = e.text
        #     char_height = getattr(e.dxf, "char_height", 1.0)
        #     rotation = getattr(e.dxf, "rotation", 0.0)
             
        #     entities_data.append({
        #         'type': 'MTEXT',
        #         'layer': layer,
        #         'location': (loc.x, loc.y),
        #         'text': text_content,
        #         'height': char_height,
        #         'rotation': rotation,
        #         'color': getattr(e.dxf, 'color', 7)
        #     })
        #     min_x = min(min_x, loc.x)
        #     max_x = max(max_x, loc.x)
        #     min_y = min(min_y, loc.y)
        #     max_y = max(max_y, loc.y)
    
    
    # Finaliser le PDF
    c.save()
    print(f"[INFO] PDF MEC officiel avec DXF intégré créé avec succès")


def draw_official_mec_with_dxf(c, width, height, affaire, msp):
    """
    Dessine une page unique combinant le format officiel MEC avec le contenu DXF
    Optimisé pour utiliser tout l'espace A4 disponible
    """
    # ========== MARGES MINIMALES ==========
    margin_top = -70      # Espace en haut = 0
    margin_bottom = 15
    margin_left = 15
    margin_right = 15
    
    # ========== ZONE MAXIMALE POUR LE DXF ==========
    # Utiliser toute la hauteur disponible sans espace en haut
    dxf_zone_top = height - margin_top  # Commence au bord supérieur
    dxf_zone_bottom = margin_bottom
    dxf_zone_height = dxf_zone_top - dxf_zone_bottom
    dxf_zone_left = margin_left
    dxf_zone_right = width - margin_right
    dxf_zone_width = dxf_zone_right - dxf_zone_left
    
    print(f"[INFO] Zone DXF maximisée: {dxf_zone_width:.1f}x{dxf_zone_height:.1f} à partir de ({dxf_zone_left}, {dxf_zone_bottom})")
    
    # Analyser les entités DXF
    entities_data = []
    min_x = min_y = float('inf')
    max_x = max_y = float('-inf')
    
    for e in msp:
        dxftype = e.dxftype()
        layer = e.dxf.layer
        
        if dxftype == "LINE":
            start, end = e.dxf.start, e.dxf.end
            entities_data.append({
                'type': 'LINE',
                'layer': layer,
                'start': (start.x, start.y),
                'end': (end.x, end.y)
            })
            min_x = min(min_x, start.x, end.x)
            max_x = max(max_x, start.x, end.x)
            min_y = min(min_y, start.y, end.y)
            max_y = max(max_y, start.y, end.y)
            
        elif dxftype in ("LWPOLYLINE", "POLYLINE"):
            points = []
            for p in (e.vertices if dxftype == "POLYLINE" else e.get_points()):
                if hasattr(p, 'x'):
                    points.append((p.x, p.y))
                else:
                    points.append((p[0], p[1]))
            
            entities_data.append({
                'type': 'POLYLINE',
                'layer': layer,
                'points': points,
                'closed': getattr(e, "closed", False) or getattr(e, "is_closed", False)
            })
            
            for x, y in points:
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)
                
        elif dxftype == "CIRCLE":
            center, radius = e.dxf.center, e.dxf.radius
            entities_data.append({
                'type': 'CIRCLE',
                'layer': layer,
                'center': (center.x, center.y),
                'radius': radius
            })
            min_x = min(min_x, center.x - radius)
            max_x = max(max_x, center.x + radius)
            min_y = min(min_y, center.y - radius)
            max_y = max(max_y, center.y + radius)
            
        elif dxftype == "ARC":
            center = e.dxf.center
            radius = e.dxf.radius
            start_angle = e.dxf.start_angle
            end_angle = e.dxf.end_angle
            entities_data.append({
                'type': 'ARC',
                'layer': layer,
                'center': (center.x, center.y),
                'radius': radius,
                'start_angle': start_angle,
                'end_angle': end_angle
            })
            min_x = min(min_x, center.x - radius)
            max_x = max(max_x, center.x + radius)
            min_y = min(min_y, center.y - radius)
            max_y = max(max_y, center.y + radius)
            
        elif dxftype == "POINT":
            p = e.dxf.location
            entities_data.append({
                'type': 'POINT',
                'layer': layer,
                'location': (p.x, p.y)
            })
            min_x = min(min_x, p.x)
            max_x = max(max_x, p.x)
            min_y = min(min_y, p.y)
            max_y = max(max_y, p.y)
            
        elif dxftype == "TEXT":
            loc = e.dxf.insert
            text_content = e.dxf.text
            height_val = getattr(e.dxf, "height", 1.0)
            rotation = getattr(e.dxf, "rotation", 0.0)
            
            entities_data.append({
                'type': 'TEXT',
                'layer': layer,
                'location': (loc.x, loc.y),
                'text': text_content,
                'height': height_val,
                'rotation': rotation
            })
            min_x = min(min_x, loc.x)
            max_x = max(max_x, loc.x)
            min_y = min(min_y, loc.y)
            max_y = max(max_y, loc.y)
            
        # elif dxftype == "MTEXT":
        #     loc = e.dxf.insert
        #     text_content = e.text
        #     char_height = getattr(e.dxf, "char_height", 1.0)
        #     rotation = getattr(e.dxf, "rotation", 0.0)
            
        #     entities_data.append({
        #         'type': 'MTEXT',
        #         'layer': layer,
        #         'location': (loc.x, loc.y),
        #         'text': text_content,
        #         'height': char_height,
        #         'rotation': rotation
        #     })
        #     min_x = min(min_x, loc.x)
        #     max_x = max(max_x, loc.x)
        #     min_y = min(min_y, loc.y)
        #     max_y = max(max_y, loc.y)
    
    # Dessiner le DXF dans la zone maximale
    if min_x != float('inf') and entities_data:
        dxf_width = max_x - min_x
        dxf_height = max_y - min_y
        
        if dxf_width > 0 and dxf_height > 0:
            # Calculer l'échelle pour s'adapter à la zone disponible
            scale_x = dxf_zone_width / dxf_width
            scale_y = dxf_zone_height / dxf_height
            scale = min(scale_x, scale_y) * 0.95  # 95% pour laisser une marge minimale
            
            # Centrer le dessin dans la zone
            offset_x = dxf_zone_left + (dxf_zone_width - dxf_width * scale) / 2
            offset_y = dxf_zone_bottom + (dxf_zone_height - dxf_height * scale) / 2
            
            print(f"[INFO] Échelle appliquée: {scale:.3f}, Offset: ({offset_x:.1f}, {offset_y:.1f})")
            print(f"[INFO] Dimensions DXF originales: {dxf_width:.1f}x{dxf_height:.1f}")
            print(f"[INFO] Dimensions après mise à l'échelle: {dxf_width*scale:.1f}x{dxf_height*scale:.1f}")
            
            # Analyser les tailles de texte pour ajustement
            text_heights = []
            for entity in entities_data:
                if entity['type'] in ['TEXT', 'MTEXT']:
                    text_heights.append(entity['height'])
            
            if text_heights:
                avg_text_height = sum(text_heights) / len(text_heights)
                print(f"[INFO] Hauteur moyenne du texte DXF: {avg_text_height:.2f}")
            
            # Fonction de transformation des coordonnées
            def transform_coords(x, y):
                pdf_x = offset_x + (x - min_x) * scale
                pdf_y = offset_y + (y - min_y) * scale
                return pdf_x, pdf_y
            
            # Dessiner toutes les entités DXF
            c.setStrokeColor(colors.black)
            c.setFillColor(colors.black)
            c.setLineWidth(0.5)  # Ligne fine pour maximiser les détails
            
            for entity in entities_data:
                entity_type = entity['type']
                layer = entity['layer']
                
                # Couleurs par layer (plus contrastées)
                if layer == "IMAGE":
                    c.setStrokeColor(colors.red)
                    c.setFillColor(colors.red)
                elif layer in ["TEXT", "LABEL_TEXT"]:
                    c.setStrokeColor(colors.blue)
                    c.setFillColor(colors.blue)
                else:
                    c.setStrokeColor(colors.black)
                    c.setFillColor(colors.black)
                
                if entity_type == 'LINE':
                    x1, y1 = transform_coords(entity['start'][0], entity['start'][1])
                    x2, y2 = transform_coords(entity['end'][0], entity['end'][1])
                    c.line(x1, y1, x2, y2)
                    
                elif entity_type == 'POLYLINE':
                    points = entity['points']
                    if len(points) > 1:
                        path = c.beginPath()
                        start_x, start_y = transform_coords(points[0][0], points[0][1])
                        path.moveTo(start_x, start_y)
                        
                        for i in range(1, len(points)):
                            x, y = transform_coords(points[i][0], points[i][1])
                            path.lineTo(x, y)
                        
                        if entity['closed']:
                            path.close()
                        
                        c.drawPath(path)
                        
                elif entity_type == 'CIRCLE':
                    center_x, center_y = transform_coords(entity['center'][0], entity['center'][1])
                    radius = entity['radius'] * scale
                    c.circle(center_x, center_y, radius, stroke=1, fill=0)
                    
                elif entity_type == 'ARC':
                    center_x, center_y = transform_coords(entity['center'][0], entity['center'][1])
                    radius = entity['radius'] * scale
                    start_angle = entity['start_angle']
                    end_angle = entity['end_angle']
                    
                    start_rad = math.radians(start_angle)
                    end_rad = math.radians(end_angle)
                    
                    num_segments = max(8, int(abs(end_angle - start_angle) / 5))
                    angle_step = (end_rad - start_rad) / num_segments
                    
                    path = c.beginPath()
                    for i in range(num_segments + 1):
                        angle = start_rad + i * angle_step
                        x = center_x + radius * math.cos(angle)
                        y = center_y + radius * math.sin(angle)
                        if i == 0:
                            path.moveTo(x, y)
                        else:
                            path.lineTo(x, y)
                    c.drawPath(path)
                    
                elif entity_type == 'POINT':
                    x, y = transform_coords(entity['location'][0], entity['location'][1])
                    c.circle(x, y, 1.0, stroke=1, fill=1)
                    
                elif entity_type in ['TEXT', 'MTEXT']:
                    x, y = transform_coords(entity['location'][0], entity['location'][1])
                    # Calcul amélioré de la taille de texte
                    original_height = entity['height']
                    
                    # Si la hauteur originale est très petite, utiliser une taille de base
                    if original_height < 0.1:
                        text_height = 8
                    elif original_height > 100:
                        # Si la hauteur est très grande, la limiter
                        text_height = min(20, original_height * scale * 0.01)
                    else:
                        # Calcul normal avec une plage raisonnable
                        text_height = original_height * scale
                        text_height = max(9.5, min(12, text_height))
                    
                    c.setFont("Helvetica", text_height)
                    
                    if entity.get('rotation', 0) != 0:
                        c.saveState()
                        c.translate(x, y)
                        c.rotate(entity['rotation'])
                        c.drawString(0, 0, str(entity['text']))
                        c.restoreState()
                    else:
                        c.drawString(x, y, str(entity['text']))
    
   

def draw_official_mec_page(c, width, height, affaire, ville):
    """
    Dessine la première page au format officiel MEC
    """
    # ========== EN-TÊTE OFFICIEL ==========
    y_pos = height - 30
    
    # Titre principal
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(width/2, y_pos, "ROYAUME DU MAROC")
    y_pos -= 15
    
    c.setFont("Helvetica", 10)
    c.drawCentredString(width/2, y_pos, "Agence Nationale de la Conservation Foncière")
    y_pos -= 12
    c.drawCentredString(width/2, y_pos, "du Cadastre et de la Cartographie")
    y_pos -= 15
    
    c.setFont("Helvetica", 9)
    c.drawCentredString(width/2, y_pos, "Direction du Cadastre")
    y_pos -= 12
    service_text = f"Service du cadastre {affaire.servicecadastre or 'RABAT HASSAN AGDAL RYAD'}"
    c.drawCentredString(width/2, y_pos, service_text)
    y_pos -= 12
    c.drawCentredString(width/2, y_pos, f"de {affaire.servicecadastre or 'RABAT HASSAN AGDAL RYAD'}")
    y_pos -= 20
    
    # Titre MEC
    # current_year = datetime.now().year
    # c.setFont("Helvetica-Bold", 11)
    # c.drawCentredString(width/2, y_pos, f"Titre : MEC {current_year}")
    # y_pos -= 15
    
    c.setFont("Helvetica", 9)
    c.drawCentredString(width/2, y_pos, f"Propriété dite: {affaire.proprietefr or 'hakim'}")
    y_pos -= 5
    c.drawCentredString(width/2, y_pos, "Nature du Travail: M.E.C")
    y_pos -= 15
    
    # SD N° centré
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(width/2, y_pos, f"SD N° {affaire.numerosd or '75'}")
    y_pos -= 40


    # ========== TABLEAU PRINCIPAL ==========
    table_x = 50
    table_width = width - 100
    table_y = y_pos
    
    # Hauteurs des lignes
    header_height = 25
    row_height = 20
    
    # Largeurs des colonnes
    col1_width = 50   # N° Ordre
    col2_width = table_width - col1_width - 70 - 80  # Désignation des travaux
    col3_width = 70   # Nombre
    col4_width = 80   # Observations
    
    # En-tête du tableau
    c.setFont("Helvetica-Bold", 9)
    
    # Dessiner les bordures d'en-tête
    c.rect(table_x, table_y - header_height, col1_width, header_height)
    c.rect(table_x + col1_width, table_y - header_height, col2_width, header_height)
    c.rect(table_x + col1_width + col2_width, table_y - header_height, col3_width, header_height)
    c.rect(table_x + col1_width + col2_width + col3_width, table_y - header_height, col4_width, header_height)
    
    # Texte d'en-tête
    c.drawCentredString(table_x + col1_width/2, table_y - header_height/2 - 3, "N° Ordre")
    c.drawCentredString(table_x + col1_width + col2_width/2, table_y - header_height/2 - 3, "Désignation des travaux")
    c.drawCentredString(table_x + col1_width + col2_width + col3_width/2, table_y - header_height/2 - 3, "Nombre")
    c.drawCentredString(table_x + col1_width + col2_width + col3_width + col4_width/2, table_y - header_height/2 - 3, "Observations")
    
    # Lignes du tableau
    table_data = [
        ("1", "Présentation Synoptique de Levé", "1", ""),
        ("2", "Procès Verbal", "2", ""),
        ("3", "Plan", "3", ""),
        ("4", "Calcul des Superficies Construites", "2", ""),
    ]
    
    c.setFont("Helvetica", 9)
    current_y = table_y - header_height
    
    for i, (ordre, designation, nombre, obs) in enumerate(table_data):
        current_y -= row_height
        
        # Dessiner les bordures
        c.rect(table_x, current_y, col1_width, row_height)
        c.rect(table_x + col1_width, current_y, col2_width, row_height)
        c.rect(table_x + col1_width + col2_width, current_y, col3_width, row_height)
        c.rect(table_x + col1_width + col2_width + col3_width, current_y, col4_width, row_height)
        
        # Texte des cellules
        c.drawCentredString(table_x + col1_width/2, current_y + row_height/2 - 3, ordre)
        c.drawString(table_x + col1_width + 5, current_y + row_height/2 - 3, designation)
        c.drawCentredString(table_x + col1_width + col2_width + col3_width/2, current_y + row_height/2 - 3, nombre)
        c.drawString(table_x + col1_width + col2_width + col3_width + 5, current_y + row_height/2 - 3, obs)
    
    # Ligne Total
    current_y -= row_height
    c.setFont("Helvetica-Bold", 9)
    c.rect(table_x, current_y, col1_width + col2_width, row_height)
    c.rect(table_x + col1_width + col2_width, current_y, col3_width, row_height)
    c.rect(table_x + col1_width + col2_width + col3_width, current_y, col4_width, row_height)
    
    c.drawCentredString(table_x + (col1_width + col2_width)/2, current_y + row_height/2 - 3, "Total")
    c.drawCentredString(table_x + col1_width + col2_width + col3_width/2, current_y + row_height/2 - 3, "8")
    
    # ========== SECTION INFÉRIEURE ==========
    current_y -= 30
    
    # Section gauche - Informations
    left_section_x = 50
    left_section_width = (width - 100) / 2 - 10
    
    c.setFont("Helvetica", 9)
    info_y = current_y
    
    # Boîtes d'information
    box_height = 18
    
    # Dépôt N°
    c.rect(left_section_x, info_y - box_height, left_section_width, box_height)
    c.drawString(left_section_x + 5, info_y - box_height/2 - 3, f"Dépôt N°: {affaire.numerosd or ''}")
    info_y -= box_height + 3
    
    # Date
    datemec_fr = format_date_fr(affaire.datemec) if affaire.datemec else ""
    date_text = f"A {ville or ''} le {datemec_fr}".strip()
    c.rect(left_section_x, info_y - box_height, left_section_width, box_height)
    c.drawString(left_section_x + 5, info_y - box_height/2 - 3, f"Date: {date_text}")
    info_y -= box_height + 3
    
    # Mappe
    c.rect(left_section_x, info_y - box_height, left_section_width, box_height)
    c.drawString(left_section_x + 5, info_y - box_height/2 - 3, f"Mappe: {affaire.mappecadre or 'map 15'} au {affaire.consistance or ''}")
    info_y -= box_height + 3 
    
    # Zoning
    c.rect(left_section_x, info_y - box_height, left_section_width, box_height)
    c.drawString(left_section_x + 5, info_y - box_height/2 - 3, "Zoning:")
    info_y -= box_height + 3
    
    # Carnet N°
    c.rect(left_section_x, info_y - box_height, left_section_width, box_height)
    c.drawString(left_section_x + 5, info_y - box_height/2 - 3, "Carnet N°:")
    info_y -= box_height + 3
    
    # Ilot N°
    c.rect(left_section_x, info_y - box_height, left_section_width, box_height)
    c.drawString(left_section_x + 5, info_y - box_height/2 - 3, "Ilot N°:")
    info_y -= box_height + 3
    
    # Du
    c.rect(left_section_x, info_y - box_height, left_section_width, box_height)
    c.drawString(left_section_x + 5, info_y - box_height/2 - 3, "Du:")
    
    # Section droite - Signature et date
    right_section_x = width/2 + 10
    right_section_width = (width - 100) / 2 - 10
    
    signature_y = current_y
    
    # Grande boîte pour signature
    signature_box_height = 150
    c.rect(right_section_x, signature_y - signature_box_height, right_section_width, signature_box_height)
    
    # Texte dans la boîte de signature
    c.setFont("Helvetica", 9)
    c.drawString(right_section_x + 5, signature_y - 25, f"Etabli par L'I.G.T {affaire.nometprenom or 'abennour hakim'}")






# montage photos





@app.post("/generate-pdf-from-dxf/")
async def export_dxf_as_montage_photos_pdf(
    affaire_id: int = Form(...),
    IGT: str = Form(...),
    ville: str = Form(...),
    adresse: str = Form(...),
    tele: str = Form(...),
    email: str = Form(...)
):
    try:
        global latest_modified_dxf_path
        if not latest_modified_dxf_path or not os.path.isfile(latest_modified_dxf_path):
            return JSONResponse(status_code=404, content={"error": "Aucun fichier DXF modifié disponible."})

        uid = uuid.uuid4().hex
        pdf_output_path = os.path.join(OUTPUT_FOLDER, f"MONTAGE_PHOTOS_{uid}.pdf")

        # Lire le fichier DXF modifié
        doc = readfile(latest_modified_dxf_path)
        msp = doc.modelspace()
        print("[INFO] Lecture DXF modifié OK pour montage photos")

        # Récupérer l'affaire depuis la BDD
        db: Session = SessionLocal()
        try:
            affaire = db.query(Affaire).filter(Affaire.id == affaire_id).first()
            if not affaire:
                return JSONResponse(status_code=404, content={"error": "Affaire introuvable."})
            
            images = db.query(Image).filter(Image.affaire_id == affaire_id).all()
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": f"Erreur BDD: {e}"})
        finally:
            db.close()

        # Générer le PDF montage photos
        create_montage_photos_pdf(doc, msp, pdf_output_path, affaire, images, IGT, adresse, tele, email, ville)
        print(f"[INFO] PDF Montage Photos généré à : {pdf_output_path}")

        # Envoyer le fichier PDF
        return FileResponse(
            path=pdf_output_path,
            media_type="application/pdf",
            filename=f"MONTAGE_PHOTOS_{affaire_id}_{datetime.now().strftime('%Y%m%d')}.pdf",
            headers={"Content-Disposition": f"attachment; filename=MONTAGE_PHOTOS_{affaire_id}_{datetime.now().strftime('%Y%m%d')}.pdf"}
        )

    except Exception as e: 
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})


def create_montage_photos_pdf(doc, msp, pdf_output_path, affaire, images, IGT, adresse, tele, email, ville):
    width, height = A4
    c = canvas.Canvas(pdf_output_path, pagesize=A4)

    if len(images) == 0:
        c.save()
        print(f"[INFO] PDF Montage Photos créé avec succès (aucune image)")
        return

    # Première page avec en-tête complet SANS images
    draw_montage_photos_first_page(c, IGT, adresse, tele, email, width, height, affaire, images, ville)
    c.showPage()

    # Pages suivantes avec TOUTES les images
    remaining_images = images
    images_per_page = 2
    
    if remaining_images:
        total_remaining_pages = (len(remaining_images) + images_per_page - 1) // images_per_page
        
        for page_num in range(total_remaining_pages):
            start_idx = page_num * images_per_page
            end_idx = min(start_idx + images_per_page, len(remaining_images))
            page_images = remaining_images[start_idx:end_idx]
            
            draw_montage_photos_images_only(c, IGT,affaire, width, height, page_images, page_num + 2, total_remaining_pages + 1)
            c.showPage()

    c.save()
    print(f"[INFO] PDF Montage Photos créé avec succès")


def draw_montage_photos_first_page(c, IGT, adresse, tele, email, width, height, affaire, images, ville):
    margin = 50
    current_y = height - 40
    
    # Bordure extérieure de la page (rectangle principal)
    c.setStrokeColor(colors.black)
    c.setLineWidth(0.8)
    c.rect(30, 30, width - 60, height - 60, stroke=1, fill=0)
    
    # Position Y pour le contenu à l'intérieur de la bordure
    content_start_y = height - 70
    current_y = content_start_y

    # === SECTION 1: EN-TÊTE ORGANISATIONNEL ===
    header_y = current_y - 1
    c.setFont("Helvetica", 10)
    c.drawCentredString(width / 2, header_y, "Agence Nationale de la Conservation Foncière")
    header_y -= 15

    c.setFont("Helvetica", 10)  
    c.drawCentredString(width / 2, header_y, "du Cadastre et de la Cartographie")
    header_y -= 18

    c.setFont("Helvetica", 10)
    c.drawCentredString(width / 2, header_y, "Direction du Cadastre")
    header_y -= 15
    
    c.drawCentredString(width / 2, header_y, f"Service du Cadastre De {affaire.servicecadastre or 'KENITRA'}")
    
    # Ligne séparatrice après l'en-tête
    current_y = header_y - 30
    c.setLineWidth(0.8)
    c.line(30, current_y, width - 30, current_y)
    current_y -= 20

    # === SECTION 2: TITRE "MONTAGE PHOTOS" ===
    title_y = current_y - 50
    c.setFont("Helvetica", 16)
    c.setFillColor(colors.blue)
    c.drawCentredString(width / 2, title_y, "MONTAGE PHOTOS")
    c.setFillColor(colors.black)
    
    # Ligne séparatrice après le titre
    current_y = title_y - 50
    c.line(30, current_y, width - 30, current_y)
    current_y -= 20

    # === SECTION 3: INFORMATIONS PRINCIPALES ===
    info_y = current_y - 20
    c.setFont("Helvetica", 11)
    
    # Titre Foncier avec ligne de pointillés
    titre_text = f"Titre Foncier : {affaire.titremec or ''}"
    c.drawString(80, info_y, titre_text)
    if not affaire.titremec:
        dots_x = 80 + c.stringWidth("Titre Foncier : ")
        dots_width = width - 140 - c.stringWidth("Titre Foncier : ")
        draw_dotted_line(c, dots_x, info_y, dots_width)
    info_y -= 22
    
    # Propriété dite avec ligne de pointillés
    prop_text = f"Propriété dite : {affaire.proprietefr or ''}"
    c.drawString(80, info_y, prop_text)
    if not affaire.proprietefr:
        dots_x = 80 + c.stringWidth("Propriété dite : ")
        dots_width = width - 140 - c.stringWidth("Propriété dite : ")
        draw_dotted_line(c, dots_x, info_y, dots_width)
    info_y -= 22
    
    # Située à avec ligne de pointillés
    sit_text = f"Située à : {ville or ''}"
    c.drawString(80, info_y, sit_text)
    if not ville:
        dots_x = 80 + c.stringWidth("Située à : ")
        dots_width = width - 140 - c.stringWidth("Située à : ")
        draw_dotted_line(c, dots_x, info_y, dots_width)
    info_y -= 22
    
    # Nature du Travail - décalée à droite
    c.drawString(80, info_y, "Nature du Travail : MEC")
    info_y -= 22
    
    # Etabli en - décalée à droite avec ligne de pointillés
    etabli_text = f"Etabli en : {format_date_fr(affaire.datemec) if affaire.datemec else ''}"
    c.drawString(80, info_y, etabli_text)
    if not affaire.datemec:
        dots_x = 80 + c.stringWidth("Etabli en : ")
        dots_width = width - 200 - c.stringWidth("Etabli en : ")
        draw_dotted_line(c, dots_x, info_y, dots_width)

    # Ligne séparatrice après les informations principales
    current_y = info_y - 25
    c.line(30, current_y, width - 30, current_y)
    current_y -= 20

   # === SECTION INFÉRIEURE – STYLE COMME IMAGE ===
    # Coordonnées de base
    box_margin = 60
    box_height = 95
    box_y = current_y - 100
    half_width = (width - 2 * box_margin) / 2

    # === SD à gauche (sans rectangle) ===
    sd_text_x = box_margin + 65
    sd_text_y = box_y + box_height - 35
    c.setFont("Helvetica", 12)
    sd_text = f"SD {affaire.numerosd or '.......'}"
    c.drawString(sd_text_x, sd_text_y, sd_text)

     # === Ligne verticale de séparation ===
    sep_x = box_margin + half_width  # Position au milieu de la largeur totale
    sep_y1 = box_y                   # Bas du cadre
    sep_y2 = box_y + box_height + 25     # Haut du cadre
    c.setLineWidth(0.8)              # Épaisseur fine
    c.line(sep_x, sep_y1, sep_x, sep_y2)

    # === Référence du dépôt à droite ===
    ref_x = box_margin + half_width + 25
    ref_y_start = box_y + box_height - 10
    c.setFont("Helvetica", 9)
    c.drawString(box_margin + half_width + 66, box_y + box_height - 5, "Référence du dépôt")

    # Champs : Carnet, Bon, Du
    c.setFont("Helvetica", 9)
    ref_line_y = ref_y_start - 18
    labels = ["Carnet N° :", "Bon N° :", "du :"]

    for label in labels:
        c.drawString(ref_x, ref_line_y, label)
        dots_x = ref_x + c.stringWidth(label)
        dots_width = half_width - 20 - c.stringWidth(label)
        draw_dotted_line(c, dots_x, ref_line_y, dots_width)
        ref_line_y -= 15

    # === Ligne séparatrice horizontale entre les deux zones ===
    separator_y = box_y
    c.setLineWidth(0.8)
    c.line(30, separator_y, width - 30, separator_y)
      

    # === Bloc du bas : coordonnées + signature ===

   # === Bloc du bas : coordonnées + signature ===

    # Coordonnées (gauche)
    coord_rect_x = box_margin
    coord_rect_y = separator_y - box_height - 60
    coord_rect_width = half_width
    coord_rect_height = 90

    # Diviser l'adresse en deux lignes si elle est trop longue
    def split_address(adresse, max_length=50):
        if len(adresse) <= max_length:
            return [adresse]
        else:
            # Cherche un espace proche du milieu pour couper proprement
            middle = len(adresse) // 2
            split_index = adresse.rfind(' ', 0, middle)
            if split_index == -1:
                split_index = middle  # s'il n'y a pas d'espace, coupe en plein milieu
            return [adresse[:split_index].strip(), adresse[split_index:].strip()]

    # Exemple d'adresse
    adresse_parts = split_address(adresse)


    # Affichage centré des coordonnées
    c.setFont("Helvetica", 10)
    contact_lines = [
        "Mr "f'{IGT}',
        "Ingénieur Géomètre Topographe",
        # f'{adresse}',
        *adresse_parts,
        f'Tél: {tele}',
        f'E-Mail: {email}'
    ]
    
    contact_y = coord_rect_y + coord_rect_height - 12
    for line in contact_lines:
        text_width = c.stringWidth(line, "Helvetica", 10)
        centered_x = coord_rect_x + (coord_rect_width - text_width) / 2
        c.drawString(centered_x, contact_y, line)
        contact_y -= 13

    # Signature (droite)
    sign_rect_x = coord_rect_x + coord_rect_width
    sign_rect_y = coord_rect_y
    sign_rect_width = coord_rect_width
    sign_rect_height = coord_rect_height

    # Titre au-dessus du rectangle
    c.setFont("Helvetica", 9)
    c.drawString(sign_rect_x + 5, sign_rect_y + 25 + sign_rect_height, "Cachet et Signature De l'IGT")

    # Rectangle vide pour le cachet
    c.rect(sign_rect_x, sign_rect_y - 30, sign_rect_width, sign_rect_height + 45, stroke=1, fill=0)

    # Mise à jour de la position verticale
    current_y = sign_rect_y - 20
    
    # === PAGINATION ===
    total_pages = 1 + ((len(images) + 1) // 2) if len(images) > 0 else 1

    c.setFont("Helvetica", 8)
    c.drawCentredString(width / 2, 40, f"Page 1 / {total_pages}")


def draw_dotted_line(c, x, y, width, dot_spacing=3):
    """Dessine une ligne de pointillés pour les champs vides"""
    current_x = x
    while current_x < x + width - dot_spacing:
        c.drawString(current_x, y, ".")
        current_x += dot_spacing


def draw_montage_photos_images_only(c, IGT, affaire, width ,height, images, page_number, total_pages):
    margin = 50
    current_y = height - 50
    image_box_height = 280  # Augmenté pour 2 images par page
    images_margin = 40

    # Bordure extérieure de la page  
    c.setStrokeColor(colors.black)
    c.setLineWidth(0.8)
    c.rect(30, 30, width - 60, height - 60, stroke=1, fill=0)

    # === Bloc entête : Informations du cadastre ===
    header_x = 40
    header_y = height - 110
    header_width = width - 80
    header_height = 60

    # Rectangle principal
    c.setLineWidth(0.8)
    c.rect(60, header_y , width - 120, header_height, stroke=1, fill=0)

    # === Partie gauche (centrée dans la moitié gauche, mais proche du bord gauche) ===
    c.setFont("Helvetica", 8)
    left_lines = [
        "ROYAUME DU MAROC",
        "ANCFCC",
        "Service du Cadastre",
        f"De {affaire.servicecadastre}"
    ]
    left_text_y = header_y + header_height - 12
    for line in left_lines:
        text_width = c.stringWidth(line, "Helvetica", 8)
        # Centré dans la moitié gauche mais décalé vers le bord gauche
        left_center = header_x + (header_width * 0.40) / 2  # réduit pour rapprocher du bord
        c.drawString(left_center - text_width / 2, left_text_y, line)
        left_text_y -= 10

    # === Partie droite (centrée dans la moitié droite, mais proche du bord droit) ===
    right_lines = [
        "Titre Foncier  :  "f"{affaire.titremec}",
        "IGT : "f"{IGT}",
        "Carnet/Bon          : .....................",
        "Date de délivrance  : .....................",
        "Zoning              : ....................."
    ]
    right_text_y = header_y + header_height - 12
    for line in right_lines:
        text_width = c.stringWidth(line, "Helvetica", 8)
        right_center = header_x + header_width * 0.80  # un peu plus à droite pour se rapprocher du bord droit
        c.drawString(right_center - text_width / 2, right_text_y, line)
        right_text_y -= 10

    # === Ajustement de la position de départ des images (sous le header) ===
    current_y = header_y - 20  # Laisser un petit espace après l'entête


    for img in images:
        draw_single_image(c, width, margin, img, current_y, image_box_height)
        current_y -= (image_box_height + images_margin)

    # Trier les images : celles avec type d'abord, ensuite celles sans type
    # Trier les images : celles avec type d'abord, ensuite celles sans type
    # images_sorted = sorted(images, key=lambda img: 0 if getattr(img, "type", None) else 1)

    # # Dessiner les images triées 
    # for img in images_sorted: 
    #     draw_single_image(c, width, margin, img, current_y, image_box_height)
    #     current_y -= (image_box_height + images_margin)


    # Pagination
    c.setFont("Helvetica", 8)
    c.drawCentredString(width / 2, 40, f"Page {page_number} / {total_pages}")


def draw_single_image(c, width, margin, img, top_y, box_height=130):
    image_box_width = width - 2 * margin
    
 
    # Cadre de l'image avec bordure plus épaisse
    img_x = margin
    img_y = top_y - box_height
    c.setStrokeColor(colors.black)
    c.setLineWidth(0.8)
    c.rect(img_x, img_y, image_box_width, box_height, stroke=1, fill=0)

    # Affichage de l'image
    image_rel_path = getattr(img, "file_path", None)
    if image_rel_path:
        abs_path = os.path.join(os.getcwd(), image_rel_path.lstrip('/'))
        if os.path.isfile(abs_path):
            try:
                img_reader = ImageReader(abs_path)
                iw, ih = img_reader.getSize()
                aspect = iw / ih
                target_aspect = image_box_width / box_height

                if aspect > target_aspect:
                    draw_w = image_box_width - 10  # Marge intérieure
                    draw_h = (image_box_width - 10) / aspect
                else:
                    draw_h = box_height - 10  # Marge intérieure
                    draw_w = (box_height - 10) * aspect

                draw_x = img_x + (image_box_width - draw_w) / 2
                draw_y = img_y + (box_height - draw_h) / 2

                c.drawImage(img_reader, draw_x, draw_y, draw_w, draw_h, preserveAspectRatio=True, mask='auto')
            except Exception as e:
                c.setFont("Helvetica", 8)
                c.drawString(img_x + 10, img_y + box_height / 2, f"Erreur image : {e}")
        else:
            c.setFont("Helvetica", 8)
            c.drawString(img_x + 10, img_y + box_height / 2, "Image non trouvée")
    else:
        c.setFont("Helvetica", 8)
        c.drawString(img_x + 10, img_y + box_height / 2, "Chemin image invalide")
    # Label de l'image (sous l'image)
    c.setFont("Helvetica-Bold", 10)  # Augmenter la taille et mettre en gras pour meilleure lisibilité
    c.drawCentredString(width / 2, img_y - 14, img.type or "")




# feuilles auxilier


# @app.post("/convert-dxf-to-shp-Feuille/")
# async def convert_dxf_to_shp_Feuille(
#     file: UploadFile = File(...),
#     affaire_id: int = Form(...),
#     IGT: str = Form(...),
#     ville: str = Form(...)
# ):
#     global latest_uploaded_dxf_path, latest_modified_dxf_path
#     try:
#         print(f"[INFO] Réception du fichier : {file.filename}")
#         uid = uuid.uuid4().hex
#         dxf_input_path = os.path.join(OUTPUT_FOLDER, f"in_{uid}.dxf")
       
#         latest_uploaded_dxf_path = dxf_input_path 
#         dxf_output_path = os.path.join(OUTPUT_FOLDER, f"modified_{uid}.dxf")
    
#         # Écrire le fichier DXF uploadé
#         with open(dxf_input_path, "wb") as f:
#             content = await file.read()
#             f.write(content)
#         print(f"[INFO] Fichier sauvegardé à : {dxf_input_path}")

#         # Lecture DXF avec gestion d'erreurs
#         try:
#             doc = ezdxf.readfile(dxf_input_path)
#             print("[INFO] DXF lu avec succès.")
#         except IOError:
#             print("[ERREUR] Impossible de lire le fichier DXF.")
#             return JSONResponse(content={"error": "Impossible de lire le fichier DXF."}, status_code=400)
#         except ezdxf.DXFStructureError as e:
#             print(f"[ERREUR] Structure DXF invalide : {e}")
#             return JSONResponse(content={"error": f"Structure DXF invalide : {str(e)}"}, status_code=400)
#         except Exception as e:
#             print(f"[ERREUR] Exception inattendue lors de la lecture DXF : {e}")
#             traceback.print_exc()
#             return JSONResponse(content={"error": f"Erreur lecture DXF : {str(e)}"}, status_code=500)

#         msp = doc.modelspace()
#         print(f"[INFO] Nombre d'entités dans le modelspace : {len(msp)}")
#         if len(msp) == 0:
#             print("[AVERTISSEMENT] Le modelspace est vide.")
#             return JSONResponse(content={"error": "Le fichier DXF ne contient aucune entité."}, status_code=400)

#         # Connexion base de données et récupération affaire
#         db: Session = SessionLocal()
#         try:
#             affaire = db.query(Affaire).filter(Affaire.id == affaire_id).first()
#             if not affaire:
#                 print("[ERREUR] Affaire introuvable.")
#                 return JSONResponse(content={"error": "Affaire introuvable."}, status_code=404)

#             images = db.query(Image).filter(Image.affaire_id == affaire_id).all()
            
#             # 🆕 NOUVELLE LOGIQUE: Récupération des consistances depuis toutes les tables
#             def extract_consistances_from_tables():
#                 """Extrait toutes les consistances des différentes tables de géométries"""
#                 all_consistances = []
                
#                 # Tables à interroger
#                 tables_to_query = [
#                     ("polygones", PolygonesLayerMec)
#                 ]
                
#                 for table_name, table_class in tables_to_query:
#                     try:
#                         geometries = db.query(table_class).filter(
#                             table_class.affaire_id == affaire_id
#                         ).all()
                        
#                         print(f"[INFO] Analyse de {len(geometries)} géométries dans {table_name}")
                        
#                         for geom in geometries:
#                             if hasattr(geom, 'consistances') and geom.consistances:
#                                 try:
#                                     # Parse du JSON des consistances
#                                     consistances_data = json.loads(geom.consistances)
#                                     if isinstance(consistances_data, list):
#                                         all_consistances.extend(consistances_data)
#                                         print(f"[INFO] Consistances trouvées dans {table_name}: {consistances_data}")
#                                 except json.JSONDecodeError as e:
#                                     print(f"[ERREUR] JSON invalide dans {table_name}: {e}")
#                                 except Exception as e:
#                                     print(f"[ERREUR] Erreur lors du parsing des consistances: {e}")
                    
#                     except Exception as e:
#                         print(f"[ERREUR] Erreur lors de l'interrogation de {table_name}: {e}")
#                         continue
                
#                 return all_consistances
            
#             # Récupérer toutes les consistances
#             all_consistances = extract_consistances_from_tables()
#             print(f"[INFO] Total consistances récupérées: {len(all_consistances)}")
            
#             # 🔍 Analyser et générer les niveaux à partir des consistances
#             def generate_niveaux_from_consistances(consistances_list):
#                 """Génère les niveaux à partir de la liste des consistances"""
#                 niveaux_dict = {}
                
#                 for consistance in consistances_list:
#                     if isinstance(consistance, dict):
#                         type_consistance = consistance.get('type', '').strip().upper()
#                         nb_consistance = consistance.get('nb_consistance', 0)
                        
#                         # ✅ Filtrer seulement les consistances avec nb_consistance != 0
#                         if nb_consistance != 0 and type_consistance:
#                             print(f"[INFO] Consistance active: {type_consistance} = {nb_consistance}")
                            
#                             # 🏗️ Générer les niveaux en fonction du nombre
#                             if type_consistance not in niveaux_dict:
#                                 niveaux_dict[type_consistance] = []
                            
#                             # Pour chaque niveau (1, 2, 3, etc.)
#                             for i in range(1, nb_consistance + 1):
#                                 niveau_info = {
#                                     'type': type_consistance,
#                                     'numero': i,
#                                     'total': nb_consistance
#                                 }
#                                 niveaux_dict[type_consistance].append(niveau_info)
                
#                 return niveaux_dict
            
#             # Générer les niveaux
#             niveaux_dict = generate_niveaux_from_consistances(all_consistances)
            
#             # 📋 Mapping des types vers les descriptions
#             type_descriptions = {
#                 'S/SOL': 'Sous-sol',
#                 'SOUS-SOL': 'Sous-sol', 
#                 'SS': 'Sous-sol',
#                 'RDC': 'Rez-de-chaussée',
#                 'REZ-DE-CHAUSSÉE': 'Rez-de-chaussée',
#                 'REZ DE CHAUSSÉE': 'Rez-de-chaussée',
#                 'MEZZANINE': 'Mezzanine',
#                 'ÉTAGE': 'Étage',
#                 'TERRASSE': 'Terrasse',
#                 'COMBLES': 'Combles',
#                 'GRENIER': 'Grenier'
#             }
            
#             # 🔤 Générer le texte des niveaux
#             def format_niveau_description(type_consistance, numero, total):
#                 """Formate la description d'un niveau"""
#                 base_description = type_descriptions.get(type_consistance, type_consistance.title())
                
#                 if type_consistance in ['ÉTAGE', 'ETAGE']:
#                     if numero == 1:
#                         return f"1er étage : Premier étage"
#                     elif numero == 2:
#                         return f"2ème étage : Deuxième étage" 
#                     elif numero == 3:
#                         return f"3ème étage : Troisième étage"
#                     else:
#                         return f"{numero}ème étage : {numero}ème étage"
#                 elif type_consistance in ['S/SOL', 'SOUS-SOL', 'SS']:
#                     if total == 1:
#                         return f"Sous-sol : Niveau souterrain"
#                     else:
#                         return f"Sous-sol {numero} : Niveau souterrain {numero}"
#                 elif type_consistance == 'RDC':
#                     return f"RDC : Rez-de-chaussée"
#                 elif type_consistance == 'MEZZANINE':
#                     if total == 1:
#                         return f"Mezzanine : Niveau mezzanine"
#                     else:
#                         return f"Mezzanine {numero} : Niveau mezzanine {numero}"
#                 else:
#                     if total == 1:
#                         return f"{base_description} : {base_description}"
#                     else:
#                         return f"{base_description} {numero} : {base_description} {numero}"
            
#             # 🏢 Ordre logique des niveaux (du plus bas au plus haut)
#             ordre_niveaux = ['S/SOL', 'SOUS-SOL', 'SS', 'RDC', 'MEZZANINE', 'ÉTAGE', 'ETAGE', 'TERRASSE', 'COMBLES', 'GRENIER']
            
#             # Trier et générer le texte final
#             niveaux_text_parts = []
#             descriptions_seen = set()
#             letter_index = 0
            
#             for type_niveau in ordre_niveaux:
#                 if type_niveau in niveaux_dict:
#                     for niveau_info in niveaux_dict[type_niveau]:
#                         letter = chr(ord('a') + letter_index)
#                         description = format_niveau_description(
#                             niveau_info['type'], 
#                             niveau_info['numero'], 
#                             niveau_info['total']
#                         )
#                         if description not in descriptions_seen:
#                             descriptions_seen.add(description)
#                             letter = chr(ord('a') + letter_index)
#                             niveau_line = f"                {letter}- {description}"
#                             niveaux_text_parts.append(niveau_line)
#                             letter_index += 1
#                         # niveau_line = f"                {letter}- {description}"
#                         # niveaux_text_parts.append(niveau_line)
#                         # letter_index += 1
            
#             # Construire le texte complet des niveaux
#             if niveaux_text_parts:
#                 niveaux_complet = "II) Calcul des Superficies construites des différents Niveaux :\n" + "\n".join(niveaux_text_parts)
#                 print(f"[INFO] ✅ Niveaux générés automatiquement depuis les consistances:")
#                 print(f"[INFO] Nombre de niveaux actifs: {letter_index}")
#                 for line in niveaux_text_parts:
#                     print(f"[INFO]   {line.strip()}")
#             else:
#                 # Texte par défaut si aucune consistance active trouvée
#                 niveaux_complet = """II) Calcul des Superficies construites des différents Niveaux :
#                 a- RDC : Rez-de-chaussée
#                 b- 1er étage : Premier étage"""
#                 print(f"[INFO] ⚠️ Aucune consistance active trouvée, utilisation du texte par défaut")

#         finally:
#             db.close()

#         datemec_fr = format_date_fr(affaire.datemec) if affaire.datemec else ""
#         a_le = f"A {ville or ''} le {datemec_fr}".strip()

#         remplacement_labels = {
#             "Titre: ........": affaire.titremec or "",
#             "Titre Foncier :........................": affaire.titremec or "",
#             "Titre Foncier": affaire.titremec or "",
#             "Titre foncier": affaire.titremec or "",
#             "IGT": IGT or "",
#             "(LAND POINT) AKHMOUCH Hakim": "",
#             "Propriété dite": affaire.proprietefr or "",
#             "SD N°": affaire.numerosd or "",
#             "Etabli par L'I.G.T": IGT or "",
#             "de.": affaire.servicecadastre or "",
#             "Fait à la Date du": datemec_fr or "",
#             "A ................................. le .........................": a_le,
#             "Mappe": affaire.mappecadre or "",
#             "Service du Cadastre De ": affaire.servicecadastre or "",
#             "Service du Cadastre": affaire.servicecadastre or "",
#             "Située à": ville or '',
#             "Etabli en": datemec_fr,
#             "SD": affaire.numerosd or "",
#             # 🆕 NOUVEAU: Ajout du remplacement automatique des niveaux depuis les consistances
#             "II)": niveaux_complet or "",
#         }

#         geojson = {"type": "FeatureCollection", "features": []}
#         image_type_coords = {}

#         def add_feature(geom_type, coords, layer, properties=None):
#             feature = {
#                 "type": "Feature",
#                 "properties": {"layer": layer},
#                 "geometry": {"type": geom_type, "coordinates": coords}
#             }
#             if properties:
#                 feature["properties"].update(properties)
#             geojson["features"].append(feature)

#         def split_line_into_segments(coords, layer):
#             for i in range(len(coords) - 1):
#                 add_feature("LineString", [coords[i], coords[i + 1]], layer)

#         def remplacer_label(original: str):
#             original = original.strip()
            
#             # 🆕 AMÉLIORATION: Gestion spéciale pour le texte des niveaux
#             if original.startswith("II) Calcul des Superficies construites des différents Niveaux"):
#                 return niveaux_complet, "II) Calcul des Superficies construites des différents Niveaux :"
            
#             for key, value in remplacement_labels.items():
#                 if original.startswith(key):
#                     if key in ["de.", "Service du Cadastre", "Service du Cadastre De ", "Fait à la Date du"]:
#                         return f"{key} {value}", key
#                     elif key == "A ................................. le .........................":
#                         return f"{value}", key
#                     elif key == "Titre Foncier :........................" or key == "Titre Foncier" or key == "Titre foncier":
#                         return f"Titre Foncier : {value}", key
#                     elif key == "Titre: ........":
#                         return f"Titre : {value}", key
#                     elif key == "(LAND POINT) AKHMOUCH Hakim":
#                         return f"", key
#                     elif key == "II)":
#                         return f"{value}", key
#                     else:
#                         return f"{key}: {value}", key
#             return original, None

#         # Parcours pour analyse & GeoJSON
#         for e in msp:
#             dxftype = e.dxftype()
#             layer = e.dxf.layer

#             if dxftype == "LINE":
#                 start, end = e.dxf.start, e.dxf.end
#                 split_line_into_segments([[start.x, start.y], [end.x, end.y]], layer)

#             elif dxftype in ("LWPOLYLINE", "POLYLINE"):
#                 points = [[p.x, p.y] if hasattr(p, 'x') else [p[0], p[1]]
#                           for p in (e.vertices if dxftype == "POLYLINE" else e.get_points())]
#                 split_line_into_segments(points, layer)
#                 if getattr(e, "closed", False) or getattr(e, "is_closed", False):
#                     add_feature("Polygon", [points], layer)

#             elif dxftype == "CIRCLE":
#                 center, radius = e.dxf.center, e.dxf.radius
#                 points = [[center.x + radius * cos(a), center.y + radius * sin(a)]
#                           for a in [i * 2 * pi / 36 for i in range(37)]]
#                 add_feature("Polygon", [points], layer)

#             elif dxftype == "POINT":
#                 p = e.dxf.location
#                 add_feature("Point", [p.x, p.y], layer)

#             elif dxftype == "TEXT":
#                 loc = e.dxf.insert
#                 original_label = e.dxf.text.strip()
#                 new_label, _ = remplacer_label(original_label)
#                 if original_label.lower() in ["façade", "façade principale"]:
#                     image_type_coords["façade"] = (loc.x, loc.y)
#                 props = {
#                     "label": new_label,
#                     "original": original_label,
#                     "height": getattr(e.dxf, "height", 1.0),
#                     "rotation": getattr(e.dxf, "rotation", 0.0)
#                 }
#                 add_feature("Point", [loc.x, loc.y], "LABEL_TEXT", props)

#             elif dxftype == "MTEXT":
#                 loc = e.dxf.insert
#                 original_label = e.text.strip()
#                 new_label, _ = remplacer_label(original_label)
#                 if original_label.lower() in ["façade", "façade principale"]:
#                     image_type_coords["façade"] = (loc.x, loc.y)
#                 props = {
#                     "label": new_label,
#                     "original": original_label,
#                     "height": getattr(e.dxf, "char_height", 1.0),
#                     "rotation": getattr(e.dxf, "rotation", 0.0)
#                 }
#                 add_feature("Point", [loc.x, loc.y], "LABEL_MTEXT", props)

#         # Modification réelle des textes dans le DXF pour qu'ils soient pris en compte dans le fichier final
#         for e in msp:
#             dxftype = e.dxftype()
#             if dxftype == "TEXT":
#                 original_label = e.dxf.text.strip()
#                 new_label, _ = remplacer_label(original_label)
#                 if new_label != original_label:
#                     print(f"[MODIF] Texte TEXT modifié: '{original_label}' -> '{new_label}'")
#                     e.dxf.text = new_label
#             elif dxftype == "MTEXT":
#                 original_label = e.text.strip()
#                 new_label, _ = remplacer_label(original_label)
#                 if new_label != original_label:
#                     print(f"[MODIF] Texte MTEXT modifié: '{original_label}' -> '{new_label}'")
#                     e.text = new_label

#         # Sauvegarde fichier DXF modifié
#         doc.saveas(dxf_output_path)
#         print(f"[INFO] Fichier DXF modifié sauvegardé à: {dxf_output_path}")
#         latest_modified_dxf_path = dxf_output_path

#         return JSONResponse(content=geojson)

#     except Exception as e:
#         print("[ERREUR GÉNÉRALE] Erreur inattendue :")
#         traceback.print_exc()
#         return JSONResponse(content={"error": f"Erreur lors de la conversion DXF : {str(e)}"}, status_code=500)



# @app.post("/convert-dxf-to-shp-Feuille/")
# async def convert_dxf_to_shp_Feuille(
#     file: UploadFile = File(...),
#     affaire_id: int = Form(...),
#     IGT: str = Form(...),
#     ville: str = Form(...)
# ):
#     global latest_uploaded_dxf_path, latest_modified_dxf_path
#     try:
#         print(f"[INFO] Réception du fichier : {file.filename}")
#         uid = uuid.uuid4().hex
#         dxf_input_path = os.path.join(OUTPUT_FOLDER, f"in_{uid}.dxf")
       
#         latest_uploaded_dxf_path = dxf_input_path 
#         dxf_output_path = os.path.join(OUTPUT_FOLDER, f"modified_{uid}.dxf")
    
#         # Écrire le fichier DXF uploadé
#         with open(dxf_input_path, "wb") as f:
#             content = await file.read()
#             f.write(content)
#         print(f"[INFO] Fichier sauvegardé à : {dxf_input_path}")

#         # Lecture DXF avec gestion d'erreurs
#         try:
#             doc = ezdxf.readfile(dxf_input_path)
#             print("[INFO] DXF lu avec succès.")
#         except IOError:
#             print("[ERREUR] Impossible de lire le fichier DXF.")
#             return JSONResponse(content={"error": "Impossible de lire le fichier DXF."}, status_code=400)
#         except ezdxf.DXFStructureError as e:
#             print(f"[ERREUR] Structure DXF invalide : {e}")
#             return JSONResponse(content={"error": f"Structure DXF invalide : {str(e)}"}, status_code=400)
#         except Exception as e:
#             print(f"[ERREUR] Exception inattendue lors de la lecture DXF : {e}")
#             traceback.print_exc()
#             return JSONResponse(content={"error": f"Erreur lecture DXF : {str(e)}"}, status_code=500)

#         msp = doc.modelspace()
#         print(f"[INFO] Nombre d'entités dans le modelspace : {len(msp)}")
#         if len(msp) == 0:
#             print("[AVERTISSEMENT] Le modelspace est vide.")
#             return JSONResponse(content={"error": "Le fichier DXF ne contient aucune entité."}, status_code=400)

#         # Connexion base de données et récupération affaire
#         db: Session = SessionLocal()
#         affaire = db.query(Affaire).filter(Affaire.id == affaire_id).first()
#         if not affaire:
#             print("[ERREUR] Affaire introuvable.")
#             return JSONResponse(content={"error": "Affaire introuvable."}, status_code=404)

#         images = db.query(Image).filter(Image.affaire_id == affaire_id).all()

#         datemec_fr = format_date_fr(affaire.datemec) if affaire.datemec else ""
#         a_le = f"A {ville or ''} le {datemec_fr}".strip()

#         remplacement_labels = {
#             "Titre: ........": affaire.titremec or "",
#             "Titre Foncier :........................": affaire.titremec or "",
#             "Titre Foncier": affaire.titremec or "",
#             "Titre foncier": affaire.titremec or "",
#             "IGT": IGT or "",
#             "(LAND POINT) AKHMOUCH Hakim": "",
#             "Propriété dite": affaire.proprietefr or "",
#             "SD N°": affaire.numerosd or "",
#             "Etabli par L'I.G.T": IGT or "",
#             "de.": affaire.servicecadastre or "",
#             "Fait à la Date du": datemec_fr or "",
#             "A ................................. le .........................": a_le,
#             "Mappe": affaire.mappecadre or "",
#             "Service du Cadastre De ": affaire.servicecadastre or "",
#             "Service du Cadastre": affaire.servicecadastre or "",
#             "Située à": ville or '',
#             "Etabli en": datemec_fr,
#             "SD": affaire.numerosd or "",
#         }

#         geojson = {"type": "FeatureCollection", "features": []}
#         image_type_coords = {}

#         def add_feature(geom_type, coords, layer, properties=None):
#             feature = {
#                 "type": "Feature",
#                 "properties": {"layer": layer},
#                 "geometry": {"type": geom_type, "coordinates": coords}
#             }
#             if properties:
#                 feature["properties"].update(properties)
#             geojson["features"].append(feature)

#         def split_line_into_segments(coords, layer):
#             for i in range(len(coords) - 1):
#                 add_feature("LineString", [coords[i], coords[i + 1]], layer)

#         def remplacer_label(original: str):
#             original = original.strip()
#             for key, value in remplacement_labels.items():
#                 if original.startswith(key):
#                     if key in ["de.", "Service du Cadastre", "Service du Cadastre De ", "Fait à la Date du"]:
#                         return f"{key} {value}", key
#                     elif key == "A ................................. le .........................":
#                         return f"{value}", key
#                     elif key == "Titre Foncier :........................" or key == "Titre Foncier" or key == "Titre foncier":
#                         return f"Titre Foncier : {value}", key
#                     elif key == "Titre: ........":
#                         return f"Titre : {value}", key
#                     elif key == "(LAND POINT) AKHMOUCH Hakim":
#                         return f"", key
#                     else:
#                         return f"{key}: {value}", key
#             return original, None

#         # Parcours pour analyse & GeoJSON
#         for e in msp:
#             dxftype = e.dxftype()
#             layer = e.dxf.layer

#             if dxftype == "LINE":
#                 start, end = e.dxf.start, e.dxf.end
#                 split_line_into_segments([[start.x, start.y], [end.x, end.y]], layer)

#             elif dxftype in ("LWPOLYLINE", "POLYLINE"):
#                 points = [[p.x, p.y] if hasattr(p, 'x') else [p[0], p[1]]
#                           for p in (e.vertices if dxftype == "POLYLINE" else e.get_points())]
#                 split_line_into_segments(points, layer)
#                 if getattr(e, "closed", False) or getattr(e, "is_closed", False):
#                     add_feature("Polygon", [points], layer)

#             elif dxftype == "CIRCLE":
#                 center, radius = e.dxf.center, e.dxf.radius
#                 points = [[center.x + radius * cos(a), center.y + radius * sin(a)]
#                           for a in [i * 2 * pi / 36 for i in range(37)]]
#                 add_feature("Polygon", [points], layer)

#             elif dxftype == "POINT":
#                 p = e.dxf.location
#                 add_feature("Point", [p.x, p.y], layer)

#             elif dxftype == "TEXT":
#                 loc = e.dxf.insert
#                 original_label = e.dxf.text.strip()
#                 new_label, _ = remplacer_label(original_label)
#                 if original_label.lower() in ["façade", "façade principale"]:
#                     image_type_coords["façade"] = (loc.x, loc.y)
#                 props = {
#                     "label": new_label,
#                     "original": original_label,
#                     "height": getattr(e.dxf, "height", 1.0),
#                     "rotation": getattr(e.dxf, "rotation", 0.0)
#                 }
#                 add_feature("Point", [loc.x, loc.y], "LABEL_TEXT", props)

#             elif dxftype == "MTEXT":
#                 loc = e.dxf.insert
#                 original_label = e.text.strip()
#                 new_label, _ = remplacer_label(original_label)
#                 if original_label.lower() in ["façade", "façade principale"]:
#                     image_type_coords["façade"] = (loc.x, loc.y)
#                 props = {
#                     "label": new_label,
#                     "original": original_label,
#                     "height": getattr(e.dxf, "char_height", 1.0),
#                     "rotation": getattr(e.dxf, "rotation", 0.0)
#                 }
#                 add_feature("Point", [loc.x, loc.y], "LABEL_MTEXT", props)

#         # **Modification réelle des textes dans le DXF pour qu'ils soient pris en compte dans le fichier final**
#         for e in msp:
#             dxftype = e.dxftype()
#             if dxftype == "TEXT":
#                 original_label = e.dxf.text.strip()
#                 new_label, _ = remplacer_label(original_label)
#                 if new_label != original_label:
#                     print(f"[MODIF] Texte TEXT modifié: '{original_label}' -> '{new_label}'")
#                     e.dxf.text = new_label
#             elif dxftype == "MTEXT":
#                 original_label = e.text.strip()
#                 new_label, _ = remplacer_label(original_label)
#                 if new_label != original_label:
#                     print(f"[MODIF] Texte MTEXT modifié: '{original_label}' -> '{new_label}'")
#                     e.text = new_label

      
#         # Sauvegarde fichier DXF modifié
#         doc.saveas(dxf_output_path)
#         print(f"[INFO] Fichier DXF modifié sauvegardé à: {dxf_output_path}")
#         latest_modified_dxf_path = dxf_output_path

#         return JSONResponse(content=geojson)

#     except Exception as e:
#         print("[ERREUR GÉNÉRALE] Erreur inattendue :")
#         traceback.print_exc()
#         return JSONResponse(content={"error": f"Erreur lors de la conversion DXF : {str(e)}"}, status_code=500)








@app.post("/export-feuille-auxilieres/")
async def download_latest_dxf(
    affaire_id: int = Form(...)
):
    """
    Télécharge le dernier fichier DXF modifié
    """
    global latest_modified_dxf_path
    
    try:
        # Vérifier si un fichier DXF modifié existe
        if not latest_modified_dxf_path:
            raise HTTPException(
                status_code=404, 
                detail="Aucun fichier DXF modifié disponible. Veuillez d'abord convertir un fichier."
            )
        
        # Vérifier si le fichier existe toujours sur le disque
        if not os.path.exists(latest_modified_dxf_path):
            raise HTTPException(
                status_code=404, 
                detail="Le fichier DXF modifié n'existe plus sur le serveur."
            )
        
        # Extraire le nom du fichier pour le téléchargement
        filename = os.path.basename(latest_modified_dxf_path)
        
        # Créer un nom de fichier plus convivial
        download_filename = f"plan_modifie_{filename}"
        
        print(f"[INFO] Téléchargement du fichier : {latest_modified_dxf_path}")
        
        # Retourner le fichier en téléchargement
        return FileResponse(
            path=latest_modified_dxf_path,
            filename=download_filename,
            media_type="application/octet-stream"
        )
        
    except HTTPException:  
        raise 
    except Exception as e:
        print(f"[ERREUR] Erreur lors du téléchargement : {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Erreur lors du téléchargement : {str(e)}"
        )






























@app.get("/affaires/{affaire_id}")
def get_affaire(affaire_id: int, db: Session = Depends(get_db)):
    affaire = db.query(Affaire).filter(Affaire.id == affaire_id).first()
    if not affaire:
        raise HTTPException(status_code=404, detail="Affaire non trouvée")
    return affaire



@app.post("/save-point/")
async def save_point(request: Request):
    data = await request.json()
    geometry = data.get("geometry")
    affaire_id = data.get("affaire_id")

    if not geometry:
        return {"error": "Aucune géométrie fournie."}

    try:
        shapely_geom = shape(geometry)
        geom_wkt = WKTElement(shapely_geom.wkt, srid=26191)

        with SessionLocal() as db:
            point_entry = PointsLayer(
                affaire_id=affaire_id,
                geom=geom_wkt
            )
            db.add(point_entry)
            db.commit()
            db.refresh(point_entry)

        return {"message": "✅ Point sauvegardé.", "id": point_entry.id}

    except Exception as e:
        return {"error": str(e)}


@app.post("/save-line/")
async def save_line(request: Request):
    data = await request.json()
    geometry = data.get("geometry")
    affaire_id = data.get("affaire_id")

    if not geometry:
        return {"error": "Aucune géométrie fournie."}

    try:
        shapely_geom = shape(geometry)
        geom_wkt = WKTElement(shapely_geom.wkt, srid=26191)

        with SessionLocal() as db:
            line_entry = LignesLayer(
                affaire_id=affaire_id,
                geom=geom_wkt
            )
            db.add(line_entry)
            db.commit()
            db.refresh(line_entry)

        return {"message": "✅ Ligne sauvegardée.", "id": line_entry.id}

    except Exception as e:
        return {"error": str(e)}


@app.post("/save-polygonn/")
async def save_polygon(request: Request):
    data = await request.json()
    geometry = data.get("geometry")
    affaire_id = data.get("affaire_id")

    if not geometry:
        return {"error": "Aucune géométrie fournie."}

    try:
        shapely_geom = shape(geometry)
        geom_wkt = WKTElement(shapely_geom.wkt, srid=26191)

        with SessionLocal() as db:
            polygon_entry = PolygonesLayer(
                affaire_id=affaire_id,
                geom=geom_wkt
            )
            db.add(polygon_entry)
            db.commit()
            db.refresh(polygon_entry)

        return {"message": "✅ Polygone sauvegardé.", "id": polygon_entry.id}

    except Exception as e:
        return {"error": str(e)}








@app.post("/save-point-mec/")
async def save_point(request: Request):
    data = await request.json()
    geometry = data.get("geometry")
    affaire_id = data.get("affaire_id")

    if not geometry:
        return {"error": "Aucune géométrie fournie."}

    try:
        shapely_geom = shape(geometry)
        geom_wkt = WKTElement(shapely_geom.wkt, srid=26191)

        with SessionLocal() as db:
            point_entry = PointsLayerMec(
                affaire_id=affaire_id,
                geom=geom_wkt
            )
            db.add(point_entry)
            db.commit()
            db.refresh(point_entry)

        return {"message": "✅ Point sauvegardé.", "id": point_entry.id}

    except Exception as e:
        return {"error": str(e)}


@app.post("/save-line-mec/")
async def save_line(request: Request):
    data = await request.json()
    geometry = data.get("geometry")
    affaire_id = data.get("affaire_id")

    if not geometry:
        return {"error": "Aucune géométrie fournie."}

    try:
        shapely_geom = shape(geometry)
        geom_wkt = WKTElement(shapely_geom.wkt, srid=26191)

        with SessionLocal() as db:
            line_entry = LignesLayerMec(
                affaire_id=affaire_id,
                geom=geom_wkt
            )
            db.add(line_entry)
            db.commit()
            db.refresh(line_entry)

        return {"message": "✅ Ligne sauvegardée.", "id": line_entry.id}

    except Exception as e:
        return {"error": str(e)}


# @app.post("/save-polygonn-mec/")
# async def save_polygon(request: Request):
#     data = await request.json()
#     geometry = data.get("geometry")
#     affaire_id = data.get("affaire_id")

#     if not geometry:
#         return {"error": "Aucune géométrie fournie."}

#     try:
#         shapely_geom = shape(geometry)
#         geom_wkt = WKTElement(shapely_geom.wkt, srid=26191)

#         with SessionLocal() as db:
#             polygon_entry = PolygonesLayerMec(
#                 affaire_id=affaire_id,
#                 geom=geom_wkt
#             )
#             db.add(polygon_entry)
#             db.commit()
#             db.refresh(polygon_entry)

#         return {"message": "✅ Polygone sauvegardé.", "id": polygon_entry.id}

#     except Exception as e:
#         return {"error": str(e)}



@app.post("/save-polygonn-mec/")
async def save_polygon(request: Request):
    data = await request.json()
    geometry = data.get("geometry")
    affaire_id = data.get("affaire_id")
    nature = data.get("nature")  # 🆕 Récupération de la nature
    consistances = data.get("consistances")  # 🆕 Récupération des consistances

    if not geometry:
        return {"error": "Aucune géométrie fournie."}

    try:
        shapely_geom = shape(geometry)
        geom_wkt = WKTElement(shapely_geom.wkt, srid=26191)

        with SessionLocal() as db:
            # Création de l'entrée polygone avec les nouvelles données
            polygon_entry = PolygonesLayerMec(
                affaire_id=affaire_id,
                geom=geom_wkt,
                nature=nature if nature else None,  # 🆕 Ajout de la nature
                consistances=json.dumps(consistances) if consistances else None  # 🆕 Sérialisation des consistances
            )
            db.add(polygon_entry)
            db.commit()
            db.refresh(polygon_entry)

            # 📊 Logging pour debug
            print(f"✅ Polygone sauvegardé - ID: {polygon_entry.id}")
            if nature:
                print(f"🌳 Nature: {nature}")
            if consistances:
                print(f"🏗️ Consistances: {consistances}")

        # 📋 Préparation de la réponse avec les détails
        response_data = {
            "message": "✅ Polygone sauvegardé.",
            "id": polygon_entry.id,
            "affaire_id": affaire_id
        }
        
        # Ajout des infos de classification dans la réponse
        if nature:
            response_data["nature"] = nature
        if consistances:
            response_data["consistances"] = consistances
            
        return response_data

    except Exception as e:
        print(f"❌ Erreur lors de la sauvegarde: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la sauvegarde: {str(e)}")





@app.post("/update-image-geometry/")
async def update_image_geometry(request: Request):
    data = await request.json()
    geometry = data.get("geometry")
    image_id = data.get("image_id")

    if not geometry or not image_id:
        return {"error": "Image ID ou géométrie manquante."}

    try:
        shapely_geom = shape(geometry)
        geom_wkt = WKTElement(shapely_geom.wkt, srid=26191)

        with SessionLocal() as db:
            image = db.query(Image).filter(Image.id == image_id).first()
            if not image:
                return {"error": "Image introuvable."}
  
            image.geom = geom_wkt
            db.commit()

        return {"message": "✅ Position de l’image mise à jour avec succès.", "id": image_id}

    except Exception as e:
        return {"error": str(e)}


# @app.get("/export-dxf-rich/{affaire_id}")

# @app.get("/export-dxf-from-db/{affaire_id}")
# def export_geojson_to_dxf_mec(affaire_id: int):
#     db: Session = SessionLocal()
#     try: 
#         doc = ezdxf.new(dxfversion="R2010")
#         msp = doc.modelspace()

#         # Récupérer l'affaire
#         affaire = db.query(Affaire).filter_by(id=affaire_id).first()
#         if not affaire:
#             raise HTTPException(status_code=404, detail="Affaire introuvable.")

#         # Générer le texte enrichi
#         plandate_fr = format_date_fr(affaire.plandate) if affaire.plandate else ""
#         a_le = f"{affaire.situationfr or ''} le {plandate_fr}".strip()

#         remplacement_labels = {
#             "Titre": affaire.titremec or "",
#             "Propriété dite": affaire.proprietefr or "",
#             "SD N°": affaire.numerosd or "",
#             "Etabli par L'I.G.T": affaire.nometprenom or "",
#             "A ................................. le .........................": a_le,
#             "Mappe": affaire.mappecadre or ""
#         }

#         def generer_label(key, value):
#             if key == "de":
#                 return f"{key}  {value}"
#             return f"{key}: {value}"

#         y_offset = 0
#         for key, value in remplacement_labels.items():
#             if not value:
#                 continue
#             label = generer_label(key, value)
#             msp.add_text(label, dxfattribs={"height": 2.5}).set_pos((10, 100 - y_offset), align="LEFT")
#             y_offset += 6

#         # Extraire les données géométriques depuis la base
#         def charger_geometries(cls):
#             records = db.query(cls).filter_by(affaire_id=affaire_id).all()
#             return [wkt.loads(db.scalar(r.geom)) for r in records]

#         points = charger_geometries(PointsLayerMec)
#         lignes = charger_geometries(LignesLayerMec)
#         polygones = charger_geometries(PolygonesLayerMec)

#         # Ajouter au DXF
#         for pt in points:
#             if isinstance(pt, Point):
#                 msp.add_point((pt.x, pt.y))

#         for ln in lignes:
#             if isinstance(ln, LineString):
#                 msp.add_lwpolyline(list(ln.coords))

#         for poly in polygones:
#             if isinstance(poly, Polygon):
#                 msp.add_lwpolyline(list(poly.exterior.coords), close=True)

#         # Enregistrement DXF
#         output_path = f"/tmp/export_mec_affaire_{affaire_id}.dxf"
#         doc.saveas(output_path)

#         return FileResponse(
#             path=output_path,
#             filename=f"export_mec_affaire_{affaire_id}.dxf",
#             media_type="application/dxf"
#         )

#     except Exception as e:
#         return JSONResponse(
#             content={"error": f"Erreur export DXF : {str(e)}"},
#             status_code=500
#         )
#     finally:
#         db.close()





@app.post("/upload-dxf")
async def upload_dxf(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".dxf") as tmp_file:
        tmp_file.write(await file.read())
        tmp_path = tmp_file.name

    doc = ezdxf.readfile(tmp_path)
    msp = doc.modelspace()

    entities = []
    # print(f"[DEBUG] Nombre d'entités dans le modelspace : {len(msp)}")
    for e in msp:
        # print(f" - type: {e.dxftype()}, layer: {e.dxf.layer}")
        if e.dxftype() == "LINE":
            entities.append({
                "type": "LINE",
                "start": [e.dxf.start.x, e.dxf.start.y],
                "end": [e.dxf.end.x, e.dxf.end.y]
            })
        elif e.dxftype() == "CIRCLE":
            entities.append({
                "type": "CIRCLE",
                "center": [e.dxf.center.x, e.dxf.center.y],
                "radius": e.dxf.radius
            })

    return {"entities": entities}







# @app.post("/convert-dxf-to-shp-Feuille/")
# async def convert_dxf_to_shp_Feuille(
#     file: UploadFile = File(...),
#     affaire_id: int = Form(...),
#     IGT: str = Form(...),
#     ville: str = Form(...)
# ):
#     global latest_uploaded_dxf_path, latest_modified_dxf_path
#     try:
#         print(f"[INFO] Réception du fichier : {file.filename}")
#         uid = uuid.uuid4().hex
#         dxf_input_path = os.path.join(OUTPUT_FOLDER, f"in_{uid}.dxf")
       
#         latest_uploaded_dxf_path = dxf_input_path 
#         dxf_output_path = os.path.join(OUTPUT_FOLDER, f"modified_{uid}.dxf")
    
#         # Écrire le fichier DXF uploadé
#         with open(dxf_input_path, "wb") as f:
#             content = await file.read()
#             f.write(content)
#         print(f"[INFO] Fichier sauvegardé à : {dxf_input_path}")

#         # Lecture DXF avec gestion d'erreurs
#         try:
#             doc = ezdxf.readfile(dxf_input_path)
#             print("[INFO] DXF lu avec succès.")
#         except IOError:
#             print("[ERREUR] Impossible de lire le fichier DXF.")
#             return JSONResponse(content={"error": "Impossible de lire le fichier DXF."}, status_code=400)
#         except ezdxf.DXFStructureError as e:
#             print(f"[ERREUR] Structure DXF invalide : {e}")
#             return JSONResponse(content={"error": f"Structure DXF invalide : {str(e)}"}, status_code=400)
#         except Exception as e:
#             print(f"[ERREUR] Exception inattendue lors de la lecture DXF : {e}")
#             traceback.print_exc()
#             return JSONResponse(content={"error": f"Erreur lecture DXF : {str(e)}"}, status_code=500)

#         msp = doc.modelspace()
#         print(f"[INFO] Nombre d'entités dans le modelspace : {len(msp)}")
#         if len(msp) == 0:
#             print("[AVERTISSEMENT] Le modelspace est vide.")
#             return JSONResponse(content={"error": "Le fichier DXF ne contient aucune entité."}, status_code=400)

#         # Connexion base de données et récupération affaire
#         db: Session = SessionLocal()
#         try:
#             affaire = db.query(Affaire).filter(Affaire.id == affaire_id).first()
#             if not affaire:
#                 print("[ERREUR] Affaire introuvable.")
#                 return JSONResponse(content={"error": "Affaire introuvable."}, status_code=404)

#             images = db.query(Image).filter(Image.affaire_id == affaire_id).all()
            
#             # 🆕 RÉCUPÉRATION ET AJOUT DIRECT DES POLYGONES - SUPPORT WKB ET WKT
#             try:
#                 print("[INFO] Récupération des polygones depuis DesignatedShape...")
#                 print(f"[DEBUG] Recherche pour affaire_id = {affaire_id}")
                
#                 # Récupération directe et simple
#                 polygons = db.query(DesignatedShape).filter(
#                     DesignatedShape.affaire_id == affaire_id
#                 ).all()
                
#                 print(f"[INFO] {len(polygons)} polygones trouvés pour affaire_id={affaire_id}")
                
#                 if polygons:
#                     database_polygons = []  # Pour le GeoJSON
                    
#                     for i, polygon in enumerate(polygons):
#                         try:
#                             if not polygon.geom:
#                                 print(f"[WARN] Polygone {polygon.id} sans géométrie, ignoré")
#                                 continue
                            
#                             print(f"[INFO] Traitement polygone {polygon.id}")
#                             print(f"[DEBUG] Géométrie (premiers 100 chars): {str(polygon.geom)[:100]}...")
                            
#                             coords = []
                            
#                             # 🔍 DÉTECTER LE FORMAT DE LA GÉOMÉTRIE
#                             geom_str = str(polygon.geom)
                            
#                             if geom_str.startswith('0103'):
#                                 # FORMAT WKB HEXADÉCIMAL - Convertir via PostGIS
#                                 print(f"[INFO] Polygone {polygon.id}: Format WKB détecté")
#                                 try:
#                                     # Utiliser ST_AsText pour convertir WKB en WKT
#                                     from sqlalchemy import text
                                    
#                                     result = db.execute(text(
#                                         "SELECT ST_AsText(geom) as wkt FROM designated_shapes WHERE id = :polygon_id"
#                                     ), {"polygon_id": polygon.id}).fetchone()
                                    
#                                     if result and result.wkt:
#                                         wkt_geom = result.wkt
#                                         print(f"[INFO] WKT converti: {wkt_geom[:100]}...")
                                        
#                                         # Parser le WKT
#                                         if wkt_geom.upper().startswith('POLYGON'):
#                                             coords_str = wkt_geom.replace('POLYGON((', '').replace('))', '')
#                                             coord_pairs = coords_str.split(',')
                                            
#                                             for pair in coord_pairs:
#                                                 try:
#                                                     x, y = map(float, pair.strip().split())
#                                                     coords.append((x, y))
#                                                 except:
#                                                     continue
#                                     else:
#                                         print(f"[ERREUR] Pas de WKT récupéré pour polygone {polygon.id}")
                                        
#                                 except Exception as e:
#                                     print(f"[ERREUR] Conversion WKB->WKT pour polygone {polygon.id}: {e}")
#                                     continue
                                    
#                             elif geom_str.upper().startswith('POLYGON'):
#                                 # FORMAT WKT CLASSIQUE
#                                 print(f"[INFO] Polygone {polygon.id}: Format WKT détecté")
#                                 coords_str = geom_str.replace('POLYGON((', '').replace('))', '')
#                                 coord_pairs = coords_str.split(',')
                                
#                                 for pair in coord_pairs:
#                                     try:
#                                         x, y = map(float, pair.strip().split())
#                                         coords.append((x, y))
#                                     except:
#                                         continue
#                             else:
#                                 print(f"[WARN] Polygone {polygon.id}: Format géométrique non reconnu")
#                                 continue
                            
#                             # 🎯 AJOUTER LE POLYGONE AU DXF
#                             if len(coords) >= 3:  # Minimum pour un polygone
#                                 print(f"[INFO] Polygone {polygon.id}: {len(coords)} points extraits")
                                
#                                 try:
#                                     # Créer le polygone comme LWPOLYLINE
#                                     lwpoly = msp.add_lwpolyline(
#                                         coords,
#                                         close=True,
#                                         dxfattribs={
#                                             'layer': f'DB_POLYGON_{polygon.id}',
#                                             'color': 3,  # Vert
#                                             'linetype': 'CONTINUOUS',
#                                             'lineweight': 50
#                                         }
#                                     )
                                    
#                                     # Ajouter label simple
#                                     center_x = sum(c[0] for c in coords) / len(coords)
#                                     center_y = sum(c[1] for c in coords) / len(coords)
                                    
#                                     msp.add_text(
#                                         f"DB_{polygon.id}",
#                                         dxfattribs={
#                                             'layer': f'DB_LABEL_{polygon.id}',
#                                             'color': 1,
#                                             'height': 1.5,
#                                             'insert': (center_x, center_y)
#                                         }
#                                     )
                                    
#                                     print(f"[SUCCESS] ✅ Polygone {polygon.id} ajouté au DXF avec succès!")
                                    
#                                     # Ajouter aux données pour GeoJSON
#                                     database_polygons.append({
#                                         'id': polygon.id,
#                                         'coords': coords,
#                                         'wkt': geom_str
#                                     })
                                    
#                                 except Exception as e:
#                                     print(f"[ERREUR] Ajout DXF polygone {polygon.id}: {e}")
#                                     continue
                                    
#                             else:
#                                 print(f"[WARN] Polygone {polygon.id}: pas assez de points ({len(coords)})")
                                
#                         except Exception as e:
#                             print(f"[ERREUR] Traitement polygone {polygon.id}: {e}")
#                             import traceback
#                             traceback.print_exc()
#                             continue
                    
#                     print(f"[INFO] ✅ {len(database_polygons)} polygones ajoutés avec succès au DXF")
#                 else:
#                     print("[INFO] Aucun polygone trouvé dans la base de données")
#                     database_polygons = []
                    
#             except Exception as e:
#                 print(f"[ERREUR] Récupération polygones: {e}")
#                 import traceback
#                 traceback.print_exc()
#                 database_polygons = []
                    
#             except Exception as e:
#                 print(f"[ERREUR] Récupération polygones: {e}")
#                 database_polygons = []
            
#             # 🆕 NOUVELLE LOGIQUE: Récupération des consistances depuis toutes les tables
#             def extract_consistances_from_tables():
#                 """Extrait toutes les consistances des différentes tables de géométries"""
#                 all_consistances = []
                
#                 # Tables à interroger
#                 tables_to_query = [
#                     ("polygones", PolygonesLayerMec)
#                 ]
                
#                 for table_name, table_class in tables_to_query:
#                     try:
#                         geometries = db.query(table_class).filter(
#                             table_class.affaire_id == affaire_id
#                         ).all()
                        
#                         print(f"[INFO] Analyse de {len(geometries)} géométries dans {table_name}")
                        
#                         for geom in geometries:
#                             if hasattr(geom, 'consistances') and geom.consistances:
#                                 try:
#                                     # Parse du JSON des consistances
#                                     consistances_data = json.loads(geom.consistances)
#                                     if isinstance(consistances_data, list):
#                                         all_consistances.extend(consistances_data)
#                                         print(f"[INFO] Consistances trouvées dans {table_name}: {consistances_data}")
#                                 except json.JSONDecodeError as e:
#                                     print(f"[ERREUR] JSON invalide dans {table_name}: {e}")
#                                 except Exception as e:
#                                     print(f"[ERREUR] Erreur lors du parsing des consistances: {e}")
                    
#                     except Exception as e:
#                         print(f"[ERREUR] Erreur lors de l'interrogation de {table_name}: {e}")
#                         continue
                
#                 return all_consistances
            
#             # Récupérer toutes les consistances
#             all_consistances = extract_consistances_from_tables()
#             print(f"[INFO] Total consistances récupérées: {len(all_consistances)}")
            
#             # 🔍 Analyser et générer les niveaux à partir des consistances
#             def generate_niveaux_from_consistances(consistances_list):
#                 """Génère les niveaux à partir de la liste des consistances"""
#                 niveaux_dict = {}
                
#                 for consistance in consistances_list:
#                     if isinstance(consistance, dict):
#                         type_consistance = consistance.get('type', '').strip().upper()
#                         nb_consistance = consistance.get('nb_consistance', 0)
                        
#                         # ✅ Filtrer seulement les consistances avec nb_consistance != 0
#                         if nb_consistance != 0 and type_consistance:
#                             print(f"[INFO] Consistance active: {type_consistance} = {nb_consistance}")
                            
#                             # 🏗️ Générer les niveaux en fonction du nombre
#                             if type_consistance not in niveaux_dict:
#                                 niveaux_dict[type_consistance] = []
                            
#                             # Pour chaque niveau (1, 2, 3, etc.)
#                             for i in range(1, nb_consistance + 1):
#                                 niveau_info = {
#                                     'type': type_consistance,
#                                     'numero': i,
#                                     'total': nb_consistance
#                                 }
#                                 niveaux_dict[type_consistance].append(niveau_info)
                
#                 return niveaux_dict
            
#             # Générer les niveaux
#             niveaux_dict = generate_niveaux_from_consistances(all_consistances)
            
#             # 📋 Mapping des types vers les descriptions
#             type_descriptions = {
#                 'S/SOL': 'Sous-sol',
#                 'SOUS-SOL': 'Sous-sol', 
#                 'SS': 'Sous-sol',
#                 'RDC': 'Rez-de-chaussée',
#                 'REZ-DE-CHAUSSÉE': 'Rez-de-chaussée',
#                 'REZ DE CHAUSSÉE': 'Rez-de-chaussée',
#                 'MEZZANINE': 'Mezzanine',
#                 'ÉTAGE': 'Étage',
#                 'TERRASSE': 'Terrasse',
#                 'COMBLES': 'Combles',
#                 'GRENIER': 'Grenier'
#             }
            
#             # 🔤 Générer le texte des niveaux
#             def format_niveau_description(type_consistance, numero, total):
#                 """Formate la description d'un niveau"""
#                 base_description = type_descriptions.get(type_consistance, type_consistance.title())
                
#                 if type_consistance in ['ÉTAGE', 'ETAGE']:
#                     if numero == 1:
#                         return f"1er étage : Premier étage"
#                     elif numero == 2:
#                         return f"2ème étage : Deuxième étage" 
#                     elif numero == 3:
#                         return f"3ème étage : Troisième étage"
#                     else:
#                         return f"{numero}ème étage : {numero}ème étage"
#                 elif type_consistance in ['S/SOL', 'SOUS-SOL', 'SS']:
#                     if total == 1:
#                         return f"Sous-sol : Niveau souterrain"
#                     else:
#                         return f"Sous-sol {numero} : Niveau souterrain {numero}"
#                 elif type_consistance == 'RDC':
#                     return f"RDC : Rez-de-chaussée"
#                 elif type_consistance == 'MEZZANINE':
#                     if total == 1:
#                         return f"Mezzanine : Niveau mezzanine"
#                     else:
#                         return f"Mezzanine {numero} : Niveau mezzanine {numero}"
#                 else:
#                     if total == 1:
#                         return f"{base_description} : {base_description}"
#                     else:
#                         return f"{base_description} {numero} : {base_description} {numero}"
            
#             # 🏢 Ordre logique des niveaux (du plus bas au plus haut)
#             ordre_niveaux = ['S/SOL', 'SOUS-SOL', 'SS', 'RDC', 'MEZZANINE', 'ÉTAGE', 'ETAGE', 'TERRASSE', 'COMBLES', 'GRENIER']
            
#             # Trier et générer le texte final
#             niveaux_text_parts = []
#             descriptions_seen = set()
#             letter_index = 0
            
#             for type_niveau in ordre_niveaux:
#                 if type_niveau in niveaux_dict:
#                     for niveau_info in niveaux_dict[type_niveau]:
#                         letter = chr(ord('a') + letter_index)
#                         description = format_niveau_description(
#                             niveau_info['type'], 
#                             niveau_info['numero'], 
#                             niveau_info['total']
#                         )
#                         if description not in descriptions_seen:
#                             descriptions_seen.add(description)
#                             letter = chr(ord('a') + letter_index)
#                             niveau_line = f"                {letter}- {description}"
#                             niveaux_text_parts.append(niveau_line)
#                             letter_index += 1
            
#             # Construire le texte complet des niveaux
#             if niveaux_text_parts:
#                 niveaux_complet = "II) Calcul des Superficies construites des différents Niveaux :\n" + "\n".join(niveaux_text_parts)
#                 print(f"[INFO] ✅ Niveaux générés automatiquement depuis les consistances:")
#                 print(f"[INFO] Nombre de niveaux actifs: {letter_index}")
#                 for line in niveaux_text_parts:
#                     print(f"[INFO]   {line.strip()}")
#             else:
#                 # Texte par défaut si aucune consistance active trouvée
#                 niveaux_complet = """II) Calcul des Superficies construites des différents Niveaux :
#                 a- RDC : Rez-de-chaussée
#                 b- 1er étage : Premier étage"""
#                 print(f"[INFO] ⚠️ Aucune consistance active trouvée, utilisation du texte par défaut")

#         finally:
#             db.close()

#         datemec_fr = format_date_fr(affaire.datemec) if affaire.datemec else ""
#         a_le = f"A {ville or ''} le {datemec_fr}".strip()

#         remplacement_labels = {
#             "Titre: ........": affaire.titremec or "",
#             "Titre Foncier :........................": affaire.titremec or "",
#             "Titre Foncier": affaire.titremec or "",
#             "Titre foncier": affaire.titremec or "",
#             "IGT": IGT or "",
#             "(LAND POINT) AKHMOUCH Hakim": "",
#             "Propriété dite": affaire.proprietefr or "",
#             "SD N°": affaire.numerosd or "",
#             "Etabli par L'I.G.T": IGT or "",
#             "de.": affaire.servicecadastre or "",
#             "Fait à la Date du": datemec_fr or "",
#             "A ................................. le .........................": a_le,
#             "Mappe": affaire.mappecadre or "",
#             "Service du Cadastre De ": affaire.servicecadastre or "",
#             "Service du Cadastre": affaire.servicecadastre or "",
#             "Située à": ville or '',
#             "Etabli en": datemec_fr,
#             "SD": affaire.numerosd or "",
#             # 🆕 NOUVEAU: Ajout du remplacement automatique des niveaux depuis les consistances
#             "II)": niveaux_complet or "",
#         }

#         geojson = {"type": "FeatureCollection", "features": []}
#         image_type_coords = {}

#         def add_feature(geom_type, coords, layer, properties=None):
#             feature = {
#                 "type": "Feature",
#                 "properties": {"layer": layer},
#                 "geometry": {"type": geom_type, "coordinates": coords}
#             }
#             if properties:
#                 feature["properties"].update(properties)
#             geojson["features"].append(feature)

#         def split_line_into_segments(coords, layer):
#             for i in range(len(coords) - 1):
#                 add_feature("LineString", [coords[i], coords[i + 1]], layer)

#         def remplacer_label(original: str):
#             original = original.strip()
            
#             # 🆕 AMÉLIORATION: Gestion spéciale pour le texte des niveaux
#             if original.startswith("II) Calcul des Superficies construites des différents Niveaux"):
#                 return niveaux_complet, "II) Calcul des Superficies construites des différents Niveaux :"
            
#             for key, value in remplacement_labels.items():
#                 if original.startswith(key):
#                     if key in ["de.", "Service du Cadastre", "Service du Cadastre De ", "Fait à la Date du"]:
#                         return f"{key} {value}", key
#                     elif key == "A ................................. le .........................":
#                         return f"{value}", key
#                     elif key == "Titre Foncier :........................" or key == "Titre Foncier" or key == "Titre foncier":
#                         return f"Titre Foncier : {value}", key
#                     elif key == "Titre: ........":
#                         return f"Titre : {value}", key
#                     elif key == "(LAND POINT) AKHMOUCH Hakim":
#                         return f"", key
#                     elif key == "II)":
#                         return f"{value}", key
#                     else:
#                         return f"{key}: {value}", key
#             return original, None

#         # Parcours pour analyse & GeoJSON
#         for e in msp:
#             dxftype = e.dxftype()
#             layer = e.dxf.layer

#             if dxftype == "LINE":
#                 start, end = e.dxf.start, e.dxf.end
#                 split_line_into_segments([[start.x, start.y], [end.x, end.y]], layer)

#             elif dxftype in ("LWPOLYLINE", "POLYLINE"):
#                 points = [[p.x, p.y] if hasattr(p, 'x') else [p[0], p[1]]
#                           for p in (e.vertices if dxftype == "POLYLINE" else e.get_points())]
#                 split_line_into_segments(points, layer)
#                 if getattr(e, "closed", False) or getattr(e, "is_closed", False):
#                     add_feature("Polygon", [points], layer)

#             elif dxftype == "CIRCLE":
#                 center, radius = e.dxf.center, e.dxf.radius
#                 points = [[center.x + radius * cos(a), center.y + radius * sin(a)]
#                           for a in [i * 2 * pi / 36 for i in range(37)]]
#                 add_feature("Polygon", [points], layer)

#             elif dxftype == "POINT":
#                 p = e.dxf.location
#                 add_feature("Point", [p.x, p.y], layer)

#             elif dxftype == "TEXT":
#                 loc = e.dxf.insert
#                 original_label = e.dxf.text.strip()
#                 new_label, _ = remplacer_label(original_label)
#                 if original_label.lower() in ["façade", "façade principale"]:
#                     image_type_coords["façade"] = (loc.x, loc.y)
#                 props = {
#                     "label": new_label,
#                     "original": original_label,
#                     "height": getattr(e.dxf, "height", 1.0),
#                     "rotation": getattr(e.dxf, "rotation", 0.0)
#                 }
#                 add_feature("Point", [loc.x, loc.y], "LABEL_TEXT", props)

#             elif dxftype == "MTEXT":
#                 loc = e.dxf.insert
#                 original_label = e.text.strip()
#                 new_label, _ = remplacer_label(original_label)
#                 if original_label.lower() in ["façade", "façade principale"]:
#                     image_type_coords["façade"] = (loc.x, loc.y)
#                 props = {
#                     "label": new_label,
#                     "original": original_label,
#                     "height": getattr(e.dxf, "char_height", 1.0),
#                     "rotation": getattr(e.dxf, "rotation", 0.0)
#                 }
#                 add_feature("Point", [loc.x, loc.y], "LABEL_MTEXT", props)

#         # 🆕 AJOUT DES POLYGONES DE LA DB AU GEOJSON
#         try:
#             for polygon_info in database_polygons:
#                 coords = polygon_info['coords']
#                 polygon_id = polygon_info['id']
                
#                 # Ajouter le polygone au GeoJSON
#                 add_feature("Polygon", [coords], f"DB_POLYGON_{polygon_id}", {
#                     "source": "database",
#                     "polygon_id": polygon_id,
#                     "original_wkt": polygon_info['wkt']
#                 })
#         except:
#             print("[WARN] Erreur lors de l'ajout des polygones au GeoJSON")

#         # Modification réelle des textes dans le DXF pour qu'ils soient pris en compte dans le fichier final
#         for e in msp:
#             dxftype = e.dxftype()
#             if dxftype == "TEXT":
#                 original_label = e.dxf.text.strip()
#                 new_label, _ = remplacer_label(original_label)
#                 if new_label != original_label:
#                     print(f"[MODIF] Texte TEXT modifié: '{original_label}' -> '{new_label}'")
#                     e.dxf.text = new_label
#             elif dxftype == "MTEXT":
#                 original_label = e.text.strip()
#                 new_label, _ = remplacer_label(original_label)
#                 if new_label != original_label:
#                     print(f"[MODIF] Texte MTEXT modifié: '{original_label}' -> '{new_label}'")
#                     e.text = new_label

#         # Sauvegarde fichier DXF modifié
#         doc.saveas(dxf_output_path)
#         print(f"[INFO] Fichier DXF modifié sauvegardé à: {dxf_output_path}")
#         print(f"[INFO] {len(database_polygons)} polygones de la base de données ajoutés au DXF")
#         latest_modified_dxf_path = dxf_output_path

#         return JSONResponse(content=geojson)

#     except Exception as e:
#         print("[ERREUR GÉNÉRALE] Erreur inattendue :")
#         traceback.print_exc()
#         return JSONResponse(content={"error": f"Erreur lors de la conversion DXF : {str(e)}"}, status_code=500)







@app.post("/convert-dxf-to-shp-Feuille/")
async def convert_dxf_to_shp_Feuille(
    file: UploadFile = File(...),
    affaire_id: int = Form(...),
    IGT: str = Form(...),
    ville: str = Form(...)
):
    global latest_uploaded_dxf_path, latest_modified_dxf_path
    try:
        print(f"[INFO] Réception du fichier : {file.filename}")
        uid = uuid.uuid4().hex
        dxf_input_path = os.path.join(OUTPUT_FOLDER, f"in_{uid}.dxf")
       
        latest_uploaded_dxf_path = dxf_input_path 
        dxf_output_path = os.path.join(OUTPUT_FOLDER, f"modified_{uid}.dxf")
    
        # Écrire le fichier DXF uploadé
        with open(dxf_input_path, "wb") as f:
            content = await file.read()
            f.write(content)
        print(f"[INFO] Fichier sauvegardé à : {dxf_input_path}")

        # Lecture DXF avec gestion d'erreurs
        try:
            doc = ezdxf.readfile(dxf_input_path)
            print("[INFO] DXF lu avec succès.")
        except IOError:
            print("[ERREUR] Impossible de lire le fichier DXF.")
            return JSONResponse(content={"error": "Impossible de lire le fichier DXF."}, status_code=400)
        except ezdxf.DXFStructureError as e:
            print(f"[ERREUR] Structure DXF invalide : {e}")
            return JSONResponse(content={"error": f"Structure DXF invalide : {str(e)}"}, status_code=400)
        except Exception as e:
            print(f"[ERREUR] Exception inattendue lors de la lecture DXF : {e}")
            traceback.print_exc()
            return JSONResponse(content={"error": f"Erreur lecture DXF : {str(e)}"}, status_code=500)

        msp = doc.modelspace()
        print(f"[INFO] Nombre d'entités dans le modelspace : {len(msp)}")
        if len(msp) == 0:
            print("[AVERTISSEMENT] Le modelspace est vide.")
            return JSONResponse(content={"error": "Le fichier DXF ne contient aucune entité."}, status_code=400)

        # 🆕 CALCUL DES LIMITES DU DESSIN EXISTANT AVANT AJOUT DES POLYGONES
        def calculate_drawing_bounds():
            """Calcule les limites (bbox) du contenu existant du DXF"""
            min_x = min_y = float('inf')
            max_x = max_y = float('-inf')
            
            content_found = False
            
            for entity in msp:
                try:
                    # Ignorer les layers de base et de construction
                    layer = getattr(entity.dxf, 'layer', '').upper()
                    if any(skip in layer for skip in ['DEFPOINTS', 'VIEWPORT', 'PAPER', 'MODEL']):
                        continue
                    
                    entity_bounds = None
                    
                    if entity.dxftype() == "LINE":
                        start = entity.dxf.start
                        end = entity.dxf.end
                        entity_bounds = [start.x, start.y, end.x, end.y]
                        
                    elif entity.dxftype() in ("LWPOLYLINE", "POLYLINE"):
                        points = list(entity.vertices if entity.dxftype() == "POLYLINE" else entity.get_points())
                        if points:
                            xs = [p.x if hasattr(p, 'x') else p[0] for p in points]
                            ys = [p.y if hasattr(p, 'x') else p[1] for p in points]
                            entity_bounds = [min(xs), min(ys), max(xs), max(ys)]
                            
                    elif entity.dxftype() == "CIRCLE":
                        center = entity.dxf.center
                        radius = entity.dxf.radius
                        entity_bounds = [center.x - radius, center.y - radius, 
                                       center.x + radius, center.y + radius]
                                       
                    elif entity.dxftype() in ("TEXT", "MTEXT"):
                        insert = entity.dxf.insert
                        # Ajouter une marge pour le texte
                        margin = getattr(entity.dxf, 'height', 1.0) * 2
                        entity_bounds = [insert.x - margin, insert.y - margin,
                                       insert.x + margin, insert.y + margin]
                                       
                    elif entity.dxftype() == "POINT":
                        loc = entity.dxf.location
                        entity_bounds = [loc.x, loc.y, loc.x, loc.y]
                    
                    # Mettre à jour les limites globales
                    if entity_bounds:
                        content_found = True
                        min_x = min(min_x, entity_bounds[0], entity_bounds[2])
                        min_y = min(min_y, entity_bounds[1], entity_bounds[3])
                        max_x = max(max_x, entity_bounds[0], entity_bounds[2])
                        max_y = max(max_y, entity_bounds[1], entity_bounds[3])
                        
                except Exception as e:
                    print(f"[WARN] Erreur calcul bounds pour entité {entity.dxftype()}: {e}")
                    continue
            
            if not content_found:
                print("[WARN] Aucun contenu trouvé pour calculer les limites")
                return None
                
            # Ajouter une marge de sécurité
            margin = max((max_x - min_x) * 0.05, (max_y - min_y) * 0.05, 5.0)
            
            bounds = {
                'min_x': min_x - margin,
                'min_y': min_y - margin, 
                'max_x': max_x + margin,
                'max_y': max_y + margin,
                'width': max_x - min_x + 2 * margin,
                'height': max_y - min_y + 2 * margin,
                'center_x': (min_x + max_x) / 2,
                'center_y': (min_y + max_y) / 2
            }
            
            print(f"[INFO] Limites du dessin calculées:")
            print(f"[INFO]   X: {bounds['min_x']:.2f} à {bounds['max_x']:.2f} (largeur: {bounds['width']:.2f})")  
            print(f"[INFO]   Y: {bounds['min_y']:.2f} à {bounds['max_y']:.2f} (hauteur: {bounds['height']:.2f})")
            print(f"[INFO]   Centre: ({bounds['center_x']:.2f}, {bounds['center_y']:.2f})")
            
            return bounds

        # Calculer les limites avant d'ajouter les polygones
        drawing_bounds = calculate_drawing_bounds()

        # Connexion base de données et récupération affaire
        db: Session = SessionLocal()
        try:
            affaire = db.query(Affaire).filter(Affaire.id == affaire_id).first()
            if not affaire:
                print("[ERREUR] Affaire introuvable.")
                return JSONResponse(content={"error": "Affaire introuvable."}, status_code=404)

            images = db.query(Image).filter(Image.affaire_id == affaire_id).all()
            
            # 🆕 RÉCUPÉRATION ET AJOUT INTELLIGENT DES POLYGONES
            try:
                print("[INFO] Récupération des polygones depuis DesignatedShape...")
                print(f"[DEBUG] Recherche pour affaire_id = {affaire_id}")
                
                # Récupération directe et simple
                polygons = db.query(DesignatedShape).filter(
                    DesignatedShape.affaire_id == affaire_id
                ).all()
                
                print(f"[INFO] {len(polygons)} polygones trouvés pour affaire_id={affaire_id}")
                
                if polygons and drawing_bounds:
                    database_polygons = []
                    
                    # 🎯 CALCUL DU FACTEUR D'ÉCHELLE ET POSITION INTELLIGENTE
                    def transform_coordinates(original_coords, drawing_bounds):
                        """Transforme les coordonnées du polygone pour l'adapter au dessin"""
                        if not original_coords or len(original_coords) < 3:
                            return original_coords
                            
                        # Calculer les limites du polygone original
                        orig_xs = [c[0] for c in original_coords]
                        orig_ys = [c[1] for c in original_coords]
                        orig_min_x, orig_max_x = min(orig_xs), max(orig_xs)
                        orig_min_y, orig_max_y = min(orig_ys), max(orig_ys)
                        orig_width = orig_max_x - orig_min_x
                        orig_height = orig_max_y - orig_min_y
                        
                        if orig_width == 0 or orig_height == 0:
                            return original_coords
                            
                        # Calculer le facteur d'échelle (le polygone ne doit pas dépasser 30% du dessin)
                        max_scale_x = (drawing_bounds['width'] * 0.3) / orig_width
                        max_scale_y = (drawing_bounds['height'] * 0.3) / orig_height
                        scale_factor = min(max_scale_x, max_scale_y, 1.0)  # Max 1.0 pour ne pas agrandir
                        
                        # Position cible: dans le quart supérieur droit du dessin
                        target_center_x = drawing_bounds['center_x'] + drawing_bounds['width'] * 0.15
                        target_center_y = drawing_bounds['center_y'] + drawing_bounds['height'] * 0.15
                        
                        # Centre du polygone original
                        orig_center_x = (orig_min_x + orig_max_x) / 2
                        orig_center_y = (orig_min_y + orig_max_y) / 2
                        
                        # Transformation des coordonnées
                        transformed_coords = []
                        for x, y in original_coords:
                            # 1. Centrer à l'origine
                            centered_x = x - orig_center_x
                            centered_y = y - orig_center_y
                            
                            # 2. Appliquer l'échelle
                            scaled_x = centered_x * scale_factor
                            scaled_y = centered_y * scale_factor
                            
                            # 3. Déplacer vers la position cible
                            final_x = scaled_x + target_center_x
                            final_y = scaled_y + target_center_y
                            
                            transformed_coords.append((final_x, final_y))
                        
                        print(f"[INFO] Transformation appliquée:")
                        print(f"[INFO]   Échelle: {scale_factor:.3f}")
                        print(f"[INFO]   Position: ({target_center_x:.2f}, {target_center_y:.2f})")
                        print(f"[INFO]   Taille originale: {orig_width:.2f} x {orig_height:.2f}")
                        print(f"[INFO]   Taille finale: {orig_width*scale_factor:.2f} x {orig_height*scale_factor:.2f}")
                        
                        return transformed_coords
                    
                    for i, polygon in enumerate(polygons):
                        try:
                            if not polygon.geom:
                                print(f"[WARN] Polygone {polygon.id} sans géométrie, ignoré")
                                continue
                            
                            print(f"[INFO] Traitement polygone {polygon.id}")
                            print(f"[DEBUG] Géométrie (premiers 100 chars): {str(polygon.geom)[:100]}...")
                            
                            coords = []
                            
                            # 🔍 DÉTECTER LE FORMAT DE LA GÉOMÉTRIE
                            geom_str = str(polygon.geom)
                            
                            if geom_str.startswith('0103'):
                                # FORMAT WKB HEXADÉCIMAL
                                print(f"[INFO] Polygone {polygon.id}: Format WKB détecté")
                                try:
                                    from sqlalchemy import text
                                    
                                    result = db.execute(text(
                                        "SELECT ST_AsText(geom) as wkt FROM designated_shapes WHERE id = :polygon_id"
                                    ), {"polygon_id": polygon.id}).fetchone()
                                    
                                    if result and result.wkt:
                                        wkt_geom = result.wkt
                                        print(f"[INFO] WKT converti: {wkt_geom[:100]}...")
                                        
                                        if wkt_geom.upper().startswith('POLYGON'):
                                            coords_str = wkt_geom.replace('POLYGON((', '').replace('))', '')
                                            coord_pairs = coords_str.split(',')
                                            
                                            for pair in coord_pairs:
                                                try:
                                                    x, y = map(float, pair.strip().split())
                                                    coords.append((x, y))
                                                except:
                                                    continue
                                    else:
                                        print(f"[ERREUR] Pas de WKT récupéré pour polygone {polygon.id}")
                                        
                                except Exception as e:
                                    print(f"[ERREUR] Conversion WKB->WKT pour polygone {polygon.id}: {e}")
                                    continue
                                    
                            elif geom_str.upper().startswith('POLYGON'):
                                # FORMAT WKT CLASSIQUE
                                print(f"[INFO] Polygone {polygon.id}: Format WKT détecté")
                                coords_str = geom_str.replace('POLYGON((', '').replace('))', '')
                                coord_pairs = coords_str.split(',')
                                
                                for pair in coord_pairs:
                                    try:
                                        x, y = map(float, pair.strip().split())
                                        coords.append((x, y))
                                    except:
                                        continue
                            else:
                                print(f"[WARN] Polygone {polygon.id}: Format géométrique non reconnu")
                                continue
                            
                            # 🎯 TRANSFORMER LES COORDONNÉES POUR LES PLACER INTELLIGEMMENT
                            if len(coords) >= 3:
                                print(f"[INFO] Polygone {polygon.id}: {len(coords)} points extraits")
                                
                                # Appliquer la transformation intelligente
                                transformed_coords = transform_coordinates(coords, drawing_bounds)
                                
                                try:
                                    # Créer le polygone transformé
                                    lwpoly = msp.add_lwpolyline(
                                        transformed_coords,
                                        close=True,
                                        dxfattribs={
                                            'layer': f'POLYGON_DB_{polygon.id}',
                                            'color': 3,  # Vert
                                            'linetype': 'CONTINUOUS', 
                                            'lineweight': 30
                                        }
                                    )
                                    
                                    # Ajouter label au centre du polygone transformé
                                    center_x = sum(c[0] for c in transformed_coords) / len(transformed_coords)
                                    center_y = sum(c[1] for c in transformed_coords) / len(transformed_coords)
                                    
                                    # Calculer la taille du texte proportionnelle au polygone
                                    coords_xs = [c[0] for c in transformed_coords]
                                    coords_ys = [c[1] for c in transformed_coords]
                                    poly_width = max(coords_xs) - min(coords_xs)
                                    poly_height = max(coords_ys) - min(coords_ys)
                                    text_height = min(poly_width, poly_height) * 0.1
                                    text_height = max(0.5, min(text_height, 2.0))  # Entre 0.5 et 2.0
                                    
                                    msp.add_text(
                                        f"ZONE_{polygon.id}",
                                        dxfattribs={
                                            'layer': f'LABEL_DB_{polygon.id}',
                                            'color': 1,  # Rouge
                                            'height': text_height,
                                            'insert': (center_x, center_y),
                                            'style': 'STANDARD'
                                        }
                                    )
                                    
                                    print(f"[SUCCESS] ✅ Polygone {polygon.id} placé intelligemment dans le dessin!")
                                    print(f"[INFO]     Position finale: centre ({center_x:.2f}, {center_y:.2f})")
                                    
                                    # Stocker les coordonnées transformées pour le GeoJSON
                                    database_polygons.append({
                                        'id': polygon.id,
                                        'coords': transformed_coords,
                                        'original_coords': coords,
                                        'wkt': geom_str
                                    })
                                    
                                except Exception as e:
                                    print(f"[ERREUR] Ajout DXF polygone {polygon.id}: {e}")
                                    continue
                                    
                            else:
                                print(f"[WARN] Polygone {polygon.id}: pas assez de points ({len(coords)})")
                                
                        except Exception as e:
                            print(f"[ERREUR] Traitement polygone {polygon.id}: {e}")
                            import traceback
                            traceback.print_exc()
                            continue
                    
                    print(f"[INFO] ✅ {len(database_polygons)} polygones placés intelligemment dans le dessin")
                    
                elif polygons and not drawing_bounds:
                    print("[WARN] Polygones trouvés mais limites du dessin non calculées - placement par défaut")
                    database_polygons = []
                else:
                    print("[INFO] Aucun polygone trouvé dans la base de données")
                    database_polygons = []
                    
            except Exception as e:
                print(f"[ERREUR] Récupération polygones: {e}")
                import traceback
                traceback.print_exc()
                database_polygons = []

            # 🆕 NOUVELLE LOGIQUE: Récupération des consistances depuis toutes les tables
            def extract_consistances_from_tables():
                """Extrait toutes les consistances des différentes tables de géométries"""
                all_consistances = []
                
                # Tables à interroger
                tables_to_query = [
                    ("polygones", PolygonesLayerMec)
                ]
                
                for table_name, table_class in tables_to_query:
                    try:
                        geometries = db.query(table_class).filter(
                            table_class.affaire_id == affaire_id
                        ).all()
                        
                        print(f"[INFO] Analyse de {len(geometries)} géométries dans {table_name}")
                        
                        for geom in geometries:
                            if hasattr(geom, 'consistances') and geom.consistances:
                                try:
                                    # Parse du JSON des consistances
                                    consistances_data = json.loads(geom.consistances)
                                    if isinstance(consistances_data, list):
                                        all_consistances.extend(consistances_data)
                                        print(f"[INFO] Consistances trouvées dans {table_name}: {consistances_data}")
                                except json.JSONDecodeError as e:
                                    print(f"[ERREUR] JSON invalide dans {table_name}: {e}")
                                except Exception as e:
                                    print(f"[ERREUR] Erreur lors du parsing des consistances: {e}")
                    
                    except Exception as e:
                        print(f"[ERREUR] Erreur lors de l'interrogation de {table_name}: {e}")
                        continue
                
                return all_consistances
            
            # Récupérer toutes les consistances
            all_consistances = extract_consistances_from_tables()
            print(f"[INFO] Total consistances récupérées: {len(all_consistances)}")
            
            # 🔍 Analyser et générer les niveaux à partir des consistances
            def generate_niveaux_from_consistances(consistances_list):
                """Génère les niveaux à partir de la liste des consistances"""
                niveaux_dict = {}
                
                for consistance in consistances_list:
                    if isinstance(consistance, dict):
                        type_consistance = consistance.get('type', '').strip().upper()
                        nb_consistance = consistance.get('nb_consistance', 0)
                        
                        # ✅ Filtrer seulement les consistances avec nb_consistance != 0
                        if nb_consistance != 0 and type_consistance:
                            print(f"[INFO] Consistance active: {type_consistance} = {nb_consistance}")
                            
                            # 🏗️ Générer les niveaux en fonction du nombre
                            if type_consistance not in niveaux_dict:
                                niveaux_dict[type_consistance] = []
                            
                            # Pour chaque niveau (1, 2, 3, etc.)
                            for i in range(1, nb_consistance + 1):
                                niveau_info = {
                                    'type': type_consistance,
                                    'numero': i,
                                    'total': nb_consistance
                                }
                                niveaux_dict[type_consistance].append(niveau_info)
                
                return niveaux_dict
            
            # Générer les niveaux
            niveaux_dict = generate_niveaux_from_consistances(all_consistances)
            
            # 📋 Suite du code identique pour la gestion des niveaux...
            type_descriptions = {
                'S/SOL': 'Sous-sol',
                'SOUS-SOL': 'Sous-sol', 
                'SS': 'Sous-sol',
                'RDC': 'Rez-de-chaussée',
                'REZ-DE-CHAUSSÉE': 'Rez-de-chaussée',
                'REZ DE CHAUSSÉE': 'Rez-de-chaussée',
                'MEZZANINE': 'Mezzanine',
                'ÉTAGE': 'Étage',
                'TERRASSE': 'Terrasse',
                'COMBLES': 'Combles',
                'GRENIER': 'Grenier'
            }
            
            def format_niveau_description(type_consistance, numero, total):
                """Formate la description d'un niveau"""
                base_description = type_descriptions.get(type_consistance, type_consistance.title())
                
                if type_consistance in ['ÉTAGE', 'ETAGE']:
                    if numero == 1:
                        return f"1er étage : Premier étage"
                    elif numero == 2:
                        return f"2ème étage : Deuxième étage" 
                    elif numero == 3:
                        return f"3ème étage : Troisième étage"
                    else:
                        return f"{numero}ème étage : {numero}ème étage"
                elif type_consistance in ['S/SOL', 'SOUS-SOL', 'SS']:
                    if total == 1:
                        return f"Sous-sol : Niveau souterrain"
                    else:
                        return f"Sous-sol {numero} : Niveau souterrain {numero}"
                elif type_consistance == 'RDC':
                    return f"RDC : Rez-de-chaussée"
                elif type_consistance == 'MEZZANINE':
                    if total == 1:
                        return f"Mezzanine : Niveau mezzanine"
                    else:
                        return f"Mezzanine {numero} : Niveau mezzanine {numero}"
                else:
                    if total == 1:
                        return f"{base_description} : {base_description}"
                    else:
                        return f"{base_description} {numero} : {base_description} {numero}"
            
            # 🏢 Ordre logique des niveaux (du plus bas au plus haut)
            ordre_niveaux = ['S/SOL', 'SOUS-SOL', 'SS', 'RDC', 'MEZZANINE', 'ÉTAGE', 'ETAGE', 'TERRASSE', 'COMBLES', 'GRENIER']
            
            # Trier et générer le texte final
            niveaux_text_parts = []
            descriptions_seen = set()
            letter_index = 0
            
            for type_niveau in ordre_niveaux:
                if type_niveau in niveaux_dict:
                    for niveau_info in niveaux_dict[type_niveau]:
                        letter = chr(ord('a') + letter_index)
                        description = format_niveau_description(
                            niveau_info['type'], 
                            niveau_info['numero'], 
                            niveau_info['total']
                        )
                        if description not in descriptions_seen:
                            descriptions_seen.add(description)
                            letter = chr(ord('a') + letter_index)
                            niveau_line = f"                {letter}- {description}"
                            niveaux_text_parts.append(niveau_line)
                            letter_index += 1
            
            # Construire le texte complet des niveaux
            if niveaux_text_parts:
                niveaux_complet = "II) Calcul des Superficies construites des différents Niveaux :\n" + "\n".join(niveaux_text_parts)
                print(f"[INFO] ✅ Niveaux générés automatiquement depuis les consistances:")
                print(f"[INFO] Nombre de niveaux actifs: {letter_index}")
                for line in niveaux_text_parts:
                    print(f"[INFO]   {line.strip()}")
            else:
                # Texte par défaut si aucune consistance active trouvée
                niveaux_complet = """II) Calcul des Superficies construites des différents Niveaux :
                a- RDC : Rez-de-chaussée
                b- 1er étage : Premier étage"""
                print(f"[INFO] ⚠️ Aucune consistance active trouvée, utilisation du texte par défaut")

        finally:
            db.close()

        datemec_fr = format_date_fr(affaire.datemec) if affaire.datemec else ""
        a_le = f"A {ville or ''} le {datemec_fr}".strip()

        remplacement_labels = {
            "Titre: ........": affaire.titremec or "",
            "Titre Foncier :........................": affaire.titremec or "",
            "Titre Foncier": affaire.titremec or "",
            "Titre foncier": affaire.titremec or "",
            "IGT": IGT or "",
            "(LAND POINT) AKHMOUCH Hakim": "",
            "Propriété dite": affaire.proprietefr or "",
            "SD N°": affaire.numerosd or "",
            "Etabli par L'I.G.T": IGT or "",
            "de.": affaire.servicecadastre or "",
            "Fait à la Date du": datemec_fr or "",
            "A ................................. le .........................": a_le,
            "Mappe": affaire.mappecadre or "",
            "Service du Cadastre De ": affaire.servicecadastre or "",
            "Service du Cadastre": affaire.servicecadastre or "",
            "Située à": ville or '',
            "Etabli en": datemec_fr,
            "SD": affaire.numerosd or "",
            "II)": niveaux_complet or "",
        }

        geojson = {"type": "FeatureCollection", "features": []}
        image_type_coords = {}

        def add_feature(geom_type, coords, layer, properties=None):
            feature = {
                "type": "Feature",
                "properties": {"layer": layer},
                "geometry": {"type": geom_type, "coordinates": coords}
            }
            if properties:
                feature["properties"].update(properties)
            geojson["features"].append(feature)

        def split_line_into_segments(coords, layer):
            for i in range(len(coords) - 1):
                add_feature("LineString", [coords[i], coords[i + 1]], layer)

        def remplacer_label(original: str):
            original = original.strip()
            
            if original.startswith("II) Calcul des Superficies construites des différents Niveaux"):
                return niveaux_complet, "II) Calcul des Superficies construites des différents Niveaux :"
            
            for key, value in remplacement_labels.items():
                if original.startswith(key):
                    if key in ["de.", "Service du Cadastre", "Service du Cadastre De ", "Fait à la Date du"]:
                        return f"{key} {value}", key
                    elif key == "A ................................. le .........................":
                        return f"{value}", key
                    elif key == "Titre Foncier :........................" or key == "Titre Foncier" or key == "Titre foncier":
                        return f"Titre Foncier : {value}", key
                    elif key == "Titre: ........":
                        return f"Titre : {value}", key
                    elif key == "(LAND POINT) AKHMOUCH Hakim":
                        return f"", key
                    elif key == "II)":
                        return f"{value}", key
                    else:
                        return f"{key}: {value}", key
            return original, None

        # Parcours pour analyse & GeoJSON
        for e in msp:
            dxftype = e.dxftype()
            layer = e.dxf.layer

            if dxftype == "LINE":
                start, end = e.dxf.start, e.dxf.end
                split_line_into_segments([[start.x, start.y], [end.x, end.y]], layer)

            elif dxftype in ("LWPOLYLINE", "POLYLINE"):
                points = [[p.x, p.y] if hasattr(p, 'x') else [p[0], p[1]]
                          for p in (e.vertices if dxftype == "POLYLINE" else e.get_points())]
                split_line_into_segments(points, layer)
                if getattr(e, "closed", False) or getattr(e, "is_closed", False):
                    add_feature("Polygon", [points], layer)

            elif dxftype == "CIRCLE":
                center, radius = e.dxf.center, e.dxf.radius
                points = [[center.x + radius * cos(a), center.y + radius * sin(a)]
                          for a in [i * 2 * pi / 36 for i in range(37)]]
                add_feature("Polygon", [points], layer)

            elif dxftype == "POINT":
                p = e.dxf.location
                add_feature("Point", [p.x, p.y], layer)

            elif dxftype == "TEXT":
                loc = e.dxf.insert
                original_label = e.dxf.text.strip()
                new_label, _ = remplacer_label(original_label)
                if original_label.lower() in ["façade", "façade principale"]:
                    image_type_coords["façade"] = (loc.x, loc.y)
                props = {
                    "label": new_label,
                    "original": original_label,
                    "height": getattr(e.dxf, "height", 1.0),
                    "rotation": getattr(e.dxf, "rotation", 0.0)
                }
                add_feature("Point", [loc.x, loc.y], "LABEL_TEXT", props)

            elif dxftype == "MTEXT":
                loc = e.dxf.insert
                original_label = e.text.strip()
                new_label, _ = remplacer_label(original_label)
                if original_label.lower() in ["façade", "façade principale"]:
                    image_type_coords["façade"] = (loc.x, loc.y)
                props = {
                    "label": new_label,
                    "original": original_label,
                    "height": getattr(e.dxf, "char_height", 1.0),
                    "rotation": getattr(e.dxf, "rotation", 0.0)
                }
                add_feature("Point", [loc.x, loc.y], "LABEL_MTEXT", props)

        # 🆕 AJOUT DES POLYGONES TRANSFORMÉS AU GEOJSON
        try:
            for polygon_info in database_polygons:
                transformed_coords = polygon_info['coords']  # Utiliser les coordonnées transformées
                polygon_id = polygon_info['id']
                
                # Ajouter le polygone transformé au GeoJSON
                add_feature("Polygon", [transformed_coords], f"DB_POLYGON_{polygon_id}", {
                    "source": "database",
                    "polygon_id": polygon_id,
                    "original_wkt": polygon_info['wkt'],
                    "transformation": "intelligent_placement"
                })
        except Exception as e:
            print(f"[WARN] Erreur lors de l'ajout des polygones transformés au GeoJSON: {e}")

        # Modification réelle des textes dans le DXF pour qu'ils soient pris en compte dans le fichier final
        for e in msp:
            dxftype = e.dxftype()
            if dxftype == "TEXT":
                original_label = e.dxf.text.strip()
                new_label, _ = remplacer_label(original_label)
                if new_label != original_label:
                    print(f"[MODIF] Texte TEXT modifié: '{original_label}' -> '{new_label}'")
                    e.dxf.text = new_label
            elif dxftype == "MTEXT":
                original_label = e.text.strip()
                new_label, _ = remplacer_label(original_label)
                if new_label != original_label:
                    print(f"[MODIF] Texte MTEXT modifié: '{original_label}' -> '{new_label}'")
                    e.text = new_label

        # Sauvegarde fichier DXF modifié
        doc.saveas(dxf_output_path)
        print(f"[INFO] Fichier DXF modifié sauvegardé à: {dxf_output_path}")
        print(f"[INFO] {len(database_polygons)} polygones placés intelligemment dans le dessin")
        latest_modified_dxf_path = dxf_output_path

        return JSONResponse(content=geojson)

    except Exception as e:
        print("[ERREUR GÉNÉRALE] Erreur inattendue :")
        traceback.print_exc()
        return JSONResponse(content={"error": f"Erreur lors de la conversion DXF : {str(e)}"}, status_code=500)