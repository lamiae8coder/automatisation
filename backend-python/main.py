from fastapi import FastAPI, Depends, HTTPException, Body, Request
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, Person, ImportedShapefile,Affaire, Image, DesignatedShape
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

# @app.post("/upload-shapefilee/")
# async def upload_shapefilee(file: UploadFile = File(...)):
#     global temp_polygon_gdf

#     # 🔍 Vérification du polygone temporaire
#     if temp_polygon_gdf is None:
#         return {"error": "Aucun polygone n’a été reçu. Veuillez d'abord dessiner un polygone."}

#     try:
#         # ✅ Calcul du buffer de 300m autour du polygone
#         buffer_geom = temp_polygon_gdf.geometry.buffer(300).iloc[0]
#     except Exception as e:
#         return {"error": f"Erreur lors du calcul du buffer : {e}"}

#     # 📁 Préparation des dossiers
#     os.makedirs("temp", exist_ok=True)
#     os.makedirs("temp/extracted", exist_ok=True)

#     # 🔽 Détails du fichier
#     filename = file.filename
#     ext = Path(filename).suffix.lower()
#     archive_path = os.path.join("temp", filename)

#     # 📥 Sauvegarde temporaire
#     with open(archive_path, "wb") as f:
#         f.write(await file.read())

#     try:
#         # 📦 Extraction selon le type (ZIP ou RAR)
#         if ext == ".zip":
#             with zipfile.ZipFile(archive_path, 'r') as zip_ref:
#                 zip_ref.extractall("temp/extracted")
#         elif ext == ".rar":
#             with rarfile.RarFile(archive_path, 'r') as rar_ref:
#                 rar_ref.extractall("temp/extracted")
#         else:
#             return {"error": "Format de fichier non pris en charge. Seuls .zip et .rar sont acceptés."}
#     except Exception as e:
#         return {"error": f"Erreur lors de l’extraction de l’archive : {e}"}

#     # 🔍 Recherche du fichier .shp
#     shp_file = None
#     for root, _, files in os.walk("temp/extracted"):
#         for f_name in files:
#             if f_name.endswith(".shp"):
#                 shp_file = os.path.join(root, f_name)
#                 break
#         if shp_file:
#             break

#     if not shp_file:
#         return {"error": "Fichier .shp non trouvé dans l’archive."}

#     try:
#         # ✅ Lecture du shapefile
#         shapefile_gdf = gpd.read_file(shp_file)

#         # ✅ Projection correcte
#         if shapefile_gdf.crs != "EPSG:26191":
#             shapefile_gdf = shapefile_gdf.to_crs("EPSG:26191")

#         # ✅ Filtrage spatial : intersecte buffer et hors polygone
#         filtered_gdf = shapefile_gdf[
#             shapefile_gdf.intersects(buffer_geom) &
#             ~shapefile_gdf.within(temp_polygon_gdf.geometry.iloc[0])
#         ]

#         print(f"✅ {len(filtered_gdf)} entités intersectent le buffer de 300 m.")

#         # ✅ Retour du GeoJSON
#         geojson = json.loads(filtered_gdf.to_json())
#         return geojson

#     except Exception as e:
#         print(f"❌ Erreur de traitement du shapefile : {e}")
#         return {"error": str(e)}


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
async def upload_shapefilee(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # 📁 Création des dossiers temporaires
    os.makedirs("temp", exist_ok=True)
    os.makedirs("temp/extracted", exist_ok=True)

    filename = file.filename
    ext = Path(filename).suffix.lower()
    archive_path = os.path.join("temp", filename)

    # 📅 Sauvegarde temporaire
    with open(archive_path, "wb") as f:
        f.write(await file.read())

    # 📆 Extraction de l'archive
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

    # 🔍 Trouver le fichier .shp
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

        # 🔍 Récupération du dernier shape enregistré pour affaire
        latest_shape = db.query(DesignatedShape).order_by(DesignatedShape.id.desc()).first()
        if not latest_shape:
            return {"error": "Aucun polygone de base (DesignatedShape) n'a été trouvé."}

        affaire_id = latest_shape.affaire_id
        buffer_geom = shape(json.loads(db.scalar(latest_shape.geom.ST_AsGeoJSON()))).buffer(300)

        # ✅ Filtrer par intersection avec buffer mais hors polygone
        filtered_gdf = shapefile_gdf[
            shapefile_gdf.intersects(buffer_geom) &
            ~shapefile_gdf.within(shape(json.loads(db.scalar(latest_shape.geom.ST_AsGeoJSON()))))
        ]

        # 🚫 Si vide : retourner un message sans erreur
        if filtered_gdf.empty:
            return {"message": "Aucune entité à importer selon les critères spatiaux."}

        # 📆 Enregistrement dans la table imported_shapefiles
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
        # ✅ Nettoyage du dossier "temp/extracted" après traitement
        try:
            shutil.rmtree("temp/extracted")
        except Exception as cleanup_err:
            print(f"⚠️ Erreur lors du nettoyage : {cleanup_err}")






# Point de terminaison pour vérifier que l'API fonctionne
@app.get("/health")
def health_check():
    return {"status": "OK"}

# Exécution de l'application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)



# dxf to shp




# @app.post("/convert-dxf-to-shp/")
# async def convert_dxf_to_shp(file: UploadFile = File(...)):
#     # 🔽 Sauvegarde temporaire du DXF
#     dxf_path = os.path.join(OUTPUT_FOLDER, file.filename)
#     with open(dxf_path, "wb") as f:
#         f.write(await file.read())

#     # 📂 Dossier de sortie
#     base_name = os.path.splitext(file.filename)[0]
#     shp_folder = os.path.join(OUTPUT_FOLDER, base_name)
#     os.makedirs(shp_folder, exist_ok=True)

#     shp_path = os.path.join(shp_folder, base_name)

#     # 📝 Crée shapefile
#     writer = shapefile.Writer(shp_path)
#     writer.field("LAYER", "C")

#     # 📐 Lecture DXF
#     doc = ezdxf.readfile(dxf_path)
#     msp = doc.modelspace()

#     for e in msp:
#         if e.dxftype() == "LINE":
#             start = e.dxf.start
#             end = e.dxf.end
#             writer.line([[[start.x, start.y], [end.x, end.y]]])
#             writer.record(e.dxf.layer)
#         elif e.dxftype() == "CIRCLE":
#             center = e.dxf.center
#             radius = e.dxf.radius
#             points = [
#                 [center.x + radius * cos(a), center.y + radius * sin(a)]
#                 for a in [i * 2 * pi / 36 for i in range(37)]
#             ]
#             writer.poly([points])
#             writer.record(e.dxf.layer)
#         elif e.dxftype() == "LWPOLYLINE":
#             points = [[v[0], v[1]] for v in e.get_points()]
#             if e.closed:
#                 writer.poly([points])
#             else:
#                 writer.line([points])
#             writer.record(e.dxf.layer)
#         # ➕ Ajouter d’autres géométries si besoin

#     writer.close()

#     # 📦 Création ZIP
#     zip_path = os.path.join(OUTPUT_FOLDER, f"{base_name}.zip")
#     with zipfile.ZipFile(zip_path, "w") as zipf:
#         for ext in ["shp", "shx", "dbf"]:
#             file_path = f"{shp_path}.{ext}"
#             zipf.write(
#                 file_path,
#                 arcname=os.path.basename(file_path)
#             )

#     return FileResponse(
#         zip_path,
#         filename=f"{base_name}.zip",
#         media_type="application/zip"
#     )


OUTPUT_FOLDER = "outputs"
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

@app.post("/convert-dxf-to-shp/")
async def convert_dxf_to_shp(file: UploadFile = File(...)):
    try:
        # 🔽 Sauvegarde temporaire du DXF
        dxf_path = os.path.join(OUTPUT_FOLDER, file.filename)
        with open(dxf_path, "wb") as f:
            f.write(await file.read())

        # 📐 Lecture du DXF
        doc = ezdxf.readfile(dxf_path)
        msp = doc.modelspace()

        geojson = {
            "type": "FeatureCollection",
            "features": []
        }

        def add_feature(geom_type, coords, layer):
            feature = {
                "type": "Feature",
                "properties": {"layer": layer},
                "geometry": {
                    "type": geom_type,
                    "coordinates": coords
                }
            }
            geojson["features"].append(feature)

        for e in msp:
            if e.dxftype() == "LINE":
                start = e.dxf.start
                end = e.dxf.end
                coords = [[start.x, start.y], [end.x, end.y]]
                add_feature("LineString", coords, e.dxf.layer)

            elif e.dxftype() == "CIRCLE":
                center = e.dxf.center
                radius = e.dxf.radius
                # approximer en polygone
                points = [
                    [
                        center.x + radius * cos(a),
                        center.y + radius * sin(a)
                    ] for a in [i * 2 * pi / 36 for i in range(37)]
                ]
                add_feature("Polygon", [points], e.dxf.layer)

            elif e.dxftype() == "LWPOLYLINE":
                points = [[v[0], v[1]] for v in e.get_points()]
                if e.closed:
                    add_feature("Polygon", [points], e.dxf.layer)
                else:
                    add_feature("LineString", points, e.dxf.layer)

            elif e.dxftype() == "POINT":
                p = e.dxf.location
                add_feature("Point", [p.x, p.y], e.dxf.layer)

            # ➕ Ajouter d’autres types ici (ARC, ELLIPSE…)

        # si tu veux nettoyer le fichier temporaire
        # os.remove(dxf_path)

        return JSONResponse(content=geojson)

    except Exception as e:
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )