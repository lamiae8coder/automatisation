from fastapi import FastAPI, Depends, HTTPException, Body, Request
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, Person, ImportedShapefile,Affaire,Image, DesignatedShape, PolygoneLayer,PointLayer,LigneLayer
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
from math import cos, sin, pi
from shapely.geometry import LineString as ShapelyLineString
from shapely.ops import split as shapely_split
from shapely.geometry import GeometryCollection, Point as ShapelyPoint
import traceback



app = FastAPI()
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.include_router(image.router) 

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
            for i in range(len(coords) - 1):
                add_feature("LineString", [coords[i], coords[i+1]], layer)

        for e in msp:
            dxftype = e.dxftype()
            layer = e.dxf.layer

            # if layer in ["CART", "RATTACHEMENT"]:
            #     continue

            if dxftype == "LINE":
                start, end = e.dxf.start, e.dxf.end
                coords = [[start.x, start.y], [end.x, end.y]]
                split_line_into_segments(coords, layer)

            elif dxftype in ("LWPOLYLINE", "POLYLINE"):
                points = [
                    [p.x, p.y] if hasattr(p, 'x') else [p[0], p[1]]
                    for p in (e.vertices if dxftype == "POLYLINE" else e.get_points())
                ]
                split_line_into_segments(points, layer)
                if getattr(e, "closed", False) or getattr(e, "is_closed", False):
                    add_feature("Polygon", [points], layer)

            elif dxftype == "CIRCLE":
                center, radius = e.dxf.center, e.dxf.radius
                points = [
                    [
                        center.x + radius * cos(a),
                        center.y + radius * sin(a)
                    ] for a in [i * 2 * pi / 36 for i in range(37)]
                ]
                add_feature("Polygon", [points], layer)

            elif dxftype == "POINT":
                p = e.dxf.location
                add_feature("Point", [p.x, p.y], layer)

            elif dxftype == "TEXT":
                loc = e.dxf.insert
                props = {
                    "label": e.dxf.text,
                    "height": getattr(e.dxf, "height", 1.0),
                    "rotation": getattr(e.dxf, "rotation", 0.0),
                    "h_align": getattr(e.dxf, "halign", 0),
                    "v_align": getattr(e.dxf, "valign", 0)
                }
                add_feature("Point", [loc.x, loc.y], "LABEL_TEXT", props)

            elif dxftype == "MTEXT":
                loc = e.dxf.insert
                props = {
                    "label": e.text,
                    "height": getattr(e.dxf, "char_height", 1.0),
                    "rotation": getattr(e.dxf, "rotation", 0.0),
                    "width": getattr(e.dxf, "width", None)
                }
                add_feature("Point", [loc.x, loc.y], "LABEL_MTEXT", props)

        return JSONResponse(content=geojson)

    except Exception as e:
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )






@app.get("/affaires/{affaire_id}")
def get_affaire(affaire_id: int, db: Session = Depends(get_db)):
    affaire = db.query(Affaire).filter(Affaire.id == affaire_id).first()
    if not affaire:
        raise HTTPException(status_code=404, detail="Affaire non trouvée")
    return affaire




@app.post("/save/")
def save_layer(payload: dict):
    """
    payload attendu :
    {
        "affaire_id": 1,
        "geometry_type": "point" | "line" | "polygon",
        "features": {
            "type": "FeatureCollection",
            "features": [...]
        }
    }
    """
    affaire_id = payload.get("affaire_id")
    geometry_type = payload.get("geometry_type")
    features = payload.get("features", {}).get("features", [])

    if not affaire_id or not geometry_type or not features:
        raise HTTPException(status_code=400, detail="Paramètres manquants")

    # Choisir le modèle SQLAlchemy en fonction du type
    if geometry_type == "point":
        ModelClass = PointLayer
    elif geometry_type == "line":
        ModelClass = LigneLayer
    elif geometry_type == "polygon":
        ModelClass = PolygoneLayer
    else:
        raise HTTPException(status_code=400, detail="Type de géométrie invalide")

    try:
        with SessionLocal() as db:
            # Vérifie que l’affaire existe
            affaire = db.query(Affaire).filter(Affaire.id == affaire_id).first()
            if not affaire:
                raise HTTPException(status_code=404, detail="Affaire non trouvée")

            # Insérer les features
            for feature in features:
                geom_json = feature.get("geometry")
                if not geom_json:
                    continue

                # 🔁 Shapely → GeoAlchemy
                shapely_geom = shape(geom_json)
                geom_obj = from_shape(shapely_geom, srid=26191)

                # Créer une instance du modèle choisi
                layer_entry = ModelClass(
                    affaire_id=affaire_id,
                    geom=geom_obj
                )

                db.add(layer_entry)

            db.commit()

        return {"message": "✅ Couche enregistrée avec succès."}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de l'enregistrement : {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne lors de l'enregistrement")
