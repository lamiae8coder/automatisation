# # from fastapi import FastAPI
# # from fastapi.middleware.cors import CORSMiddleware
# # from sqlalchemy import create_engine, Column, Integer, String, Date, Float
# # from sqlalchemy.orm import sessionmaker, declarative_base
# # from pydantic import BaseModel
# # from typing import Optional
# # from datetime import date

# # app = FastAPI()

# # # Autoriser Angular (CORS)
# # app.add_middleware(
# #     CORSMiddleware,
# #     allow_origins=["http://localhost:4200"],
# #     allow_credentials=True,
# #     allow_methods=["*"],
# #     allow_headers=["*"],
# # )

# # # Connexion PostgreSQL
# # DATABASE_URL = "postgresql://postgres:geoinfo@localhost:5432/maintenance_luminaires"
# # engine = create_engine(DATABASE_URL)
# # SessionLocal = sessionmaker(bind=engine)
# # Base = declarative_base()

# # # ✅ Modèle SQLAlchemy
# # class Affaire(Base):
# #     __tablename__ = "affaires"

# #     id = Column(Integer, primary_key=True, index=True)

# #     titreMec = Column(String)
# #     proprieteFr = Column(String)
# #     proprieteAr = Column(String)
# #     situationFr = Column(String)
# #     situationAr = Column(String)
# #     planDate = Column(Date)

# #     mappeCadre = Column(String)
# #     mappeReperage = Column(String)
# #     titreOrigine = Column(String)
# #     surface = Column(Float)
# #     natureTravail = Column(String)

# #     numeroSd = Column(Integer)
# #     dateMec = Column(Date)
# #     serviceCadastre = Column(String)
# #     consistance = Column(String)
# #     charges = Column(String)

# #     empietement = Column(String)
# #     surfaceEmpietement = Column(Float, nullable=True)
# #     proprietaire = Column(String)

# # # ✅ Création des tables
# # Base.metadata.create_all(bind=engine)

# # # ✅ Pydantic pour validation d'entrée
# # class AffaireCreate(BaseModel):
# #     titreMec: str
# #     proprieteFr: str
# #     proprieteAr: str
# #     situationFr: str
# #     situationAr: str
# #     planDate: date

# #     mappeCadre: str
# #     mappeReperage: str
# #     titreOrigine: str
# #     surface: float
# #     natureTravail: str

# #     numeroSd: int
# #     dateMec: date
# #     serviceCadastre: str
# #     consistance: str
# #     charges: str

# #     empietement: str
# #     surfaceEmpietement: Optional[float] = None
# #     proprietaire: str

# # # ✅ Endpoint POST pour enregistrement
# # @app.post("/affaires")
# # def create_affaire(affaire: AffaireCreate):
# #     db = SessionLocal()
# #     db_affaire = Affaire(**affaire.dict())
# #     db.add(db_affaire)
# #     db.commit()
# #     db.refresh(db_affaire)
# #     db.close()
# #     return {"message": "Affaire ajoutée avec succès", "id": db_affaire.id}

# from fastapi import FastAPI, File, UploadFile, Form
# from fastapi.middleware.cors import CORSMiddleware
# from sqlalchemy import create_engine, Column, Integer, String, Date, Float, ForeignKey
# from sqlalchemy.orm import sessionmaker, declarative_base, relationship
# from pydantic import BaseModel
# from typing import Optional, List
# from datetime import date
# import shutil
# import os

# app = FastAPI()

# # ✅ Configurer CORS pour Angular
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:4200"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # ✅ Connexion PostgreSQL
# DATABASE_URL = "postgresql://postgres:geoinfo@localhost:5432/db_cadastre_mec"
# engine = create_engine(DATABASE_URL)
# SessionLocal = sessionmaker(bind=engine)
# Base = declarative_base()

# # ✅ Modèle SQLAlchemy - Table Affaire
# class Affaire(Base):
#     __tablename__ = "affaires"

#     id = Column(Integer, primary_key=True, index=True)
#     titreMec = Column("titre_mec", String)
#     proprieteFr = Column("propriete_fr", String)
#     proprieteAr = Column("propriete_ar", String)
#     situationFr = Column("situation_fr", String)
#     situationAr = Column("situation_ar", String)
#     planDate = Column("plan_date", Date)
#     mappeCadre = Column("mappe_cadre", String)
#     mappeReperage = Column("mappe_reperage", String)
#     titreOrigine = Column("titre_origine", String)
#     surface = Column("surface", Float)
#     natureTravail = Column("nature_travail", String)
#     numeroSd = Column("numero_sd", Integer)
#     dateMec = Column("date_mec", Date)
#     serviceCadastre = Column("service_cadastre", String)
#     consistance = Column("consistance", String)
#     charges = Column("charges", String)
#     empietement = Column("empietement", String)  # ou Boolean si tu l'envoies bien comme bool
#     surfaceEmpietement = Column("surface_empietement", Float, nullable=True)
#     nometprenom = Column("nom_prenom", String)
#     cin = Column("cin", String)
#     qualite = Column("qualite", String)

#     # images = relationship("AffaireImage", back_populates="affaire")

# # ✅ Modèle SQLAlchemy - Table Images
# # class AffaireImage(Base):
# #     __tablename__ = "images"

# #     id = Column(Integer, primary_key=True, index=True)
# #     image_path = Column(String)
# #     image_type = Column(String)
# #     affaire_id = Column(Integer, ForeignKey("affaires.id"))

# #     affaire = relationship("Affaire", back_populates="images")

# # ✅ Créer les tables
# Base.metadata.create_all(bind=engine)

# # ✅ Endpoint pour l'ajout d'une affaire avec images
# @app.post("/affaires")
# async def create_affaire_with_images(
#     titreMec: str = Form(...),
#     proprieteFr: str = Form(...),
#     proprieteAr: str = Form(...),
#     situationFr: str = Form(...),
#     situationAr: str = Form(...),
#     planDate: date = Form(...),

#     mappeCadre: str = Form(...),
#     mappeReperage: str = Form(...),
#     titreOrigine: str = Form(...),
#     surface: float = Form(...),
#     natureTravail: str = Form(...),

#     numeroSd: int = Form(...),
#     dateMec: date = Form(...),
#     serviceCadastre: str = Form(...),
#     consistance: str = Form(...),
#     charges: str = Form(...),

#     empietement: str = Form(...),
#     surfaceEmpietement: Optional[float] = Form(None),
    
#     cin: str = Form(...),
#     nometprenom: str = Form(...),
#     qualite: str = Form(...)


#     # image_types: List[str] = Form(...),
#     # images: List[UploadFile] = File(...)
# ):
#     db = SessionLocal()

#     # ✅ Créer l'affaire
#     affaire = Affaire(
#         titreMec=titreMec,
#         proprieteFr=proprieteFr,
#         proprieteAr=proprieteAr,
#         situationFr=situationFr,
#         situationAr=situationAr,
#         planDate=planDate,
#         mappeCadre=mappeCadre,
#         mappeReperage=mappeReperage,
#         titreOrigine=titreOrigine,
#         surface=surface,
#         natureTravail=natureTravail,
#         numeroSd=numeroSd,
#         dateMec=dateMec,
#         serviceCadastre=serviceCadastre,
#         consistance=consistance,
#         charges=charges,
#         empietement=empietement,
#         surfaceEmpietement=surfaceEmpietement,
#         nometprenom=nometprenom,
#         cin=cin,
#         qualite=qualite
#     )
#     db.add(affaire)
#     db.commit()
#     db.refresh(affaire)

#     # ✅ Dossier pour stocker les images
#     # image_folder = "uploaded_images"
#     # os.makedirs(image_folder, exist_ok=True)

#     # ✅ Enregistrer les images
#     # for idx, image in enumerate(images):
#     #     filename = f"{affaire.id}_{image.filename}"
#     #     file_path = os.path.join(image_folder, filename)

#     #     with open(file_path, "wb") as buffer:
#     #         shutil.copyfileobj(image.file, buffer)

#     #     affaire_image = AffaireImage(
#     #         image_path=file_path,
#     #         image_type=image_types[idx],
#     #         affaire_id=affaire.id
#     #     )
#     #     db.add(affaire_image)

#     # db.commit()
#     db.close()

#     return {"message": "Affaire et images enregistrées avec succès", "id": affaire.id}

















# from fastapi import FastAPI, Form  # File, UploadFile sont commentés car images désactivées
# from fastapi.middleware.cors import CORSMiddleware
# from sqlalchemy import create_engine, Column, Integer, String, Date, Float
# from sqlalchemy.orm import sessionmaker, declarative_base
# from datetime import date
# from typing import Optional

# app = FastAPI()

# # ✅ CORS pour Angular
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:4200"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # ✅ Connexion PostgreSQL
# DATABASE_URL = "postgresql://postgres:geoinfo@localhost:5432/db_cadastre_mec"
# engine = create_engine(DATABASE_URL)
# SessionLocal = sessionmaker(bind=engine)
# Base = declarative_base()

# # ✅ Modèle SQLAlchemy
# class Affaire(Base):
#     __tablename__ = "affaires"

#     id = Column(Integer, primary_key=True, index=True)
#     titreMec = Column("titre_mec", String)
#     proprieteFr = Column("propriete_fr", String)
#     proprieteAr = Column("propriete_ar", String)
#     situationFr = Column("situation_fr", String)
#     situationAr = Column("situation_ar", String)
#     planDate = Column("plan_date", Date)
#     mappeCadre = Column("mappe_cadre", String)
#     mappeReperage = Column("mappe_reperage", String)
#     titreOrigine = Column("titre_origine", String)
#     surface = Column("surface", Float)
#     natureTravail = Column("nature_travail", String)
#     numeroSd = Column("numero_sd", Integer)
#     dateMec = Column("date_mec", Date)
#     serviceCadastre = Column("service_cadastre", String)
#     consistance = Column("consistance", String)
#     charges = Column("charges", String)
#     empietement = Column("empietement", String)  # Si bool: Column(Boolean)
#     surfaceEmpietement = Column("surface_empietement", Float, nullable=True)
#     nometprenom = Column("nom_prenom", String)
#     cin = Column("cin", String)
#     qualite = Column("qualite", String)

# # ✅ Créer les tables dans la base si elles n'existent pas
# Base.metadata.create_all(bind=engine)

# # ✅ Endpoint POST (sans gestion d’images pour l’instant)
# @app.post("/affaires")
# async def create_affaire_with_images(
#     titreMec: str = Form(...),
#     proprieteFr: str = Form(...),
#     proprieteAr: str = Form(...),
#     situationFr: str = Form(...),
#     situationAr: str = Form(...),
#     # planDate: date = Form(...),

#     mappeCadre: str = Form(...),
#     mappeReperage: str = Form(...),
#     titreOrigine: str = Form(...),
#     surface: float = Form(...),
#     natureTravail: str = Form(...),

#     numeroSd: int = Form(...),
#     # dateMec: date = Form(...),
#     serviceCadastre: str = Form(...),
#     consistance: str = Form(...),
#     charges: str = Form(...),

#     empietement: bool = Form(...),
#     surfaceEmpietement: Optional[float] = Form(None),
    
#     cin: str = Form(...),
#     nometprenom: str = Form(...),
#     qualite: str = Form(...)
# ):
#     db = SessionLocal()
#     try:
#         affaire = Affaire(
#             titreMec=titreMec,
#             proprieteFr=proprieteFr,
#             proprieteAr=proprieteAr,
#             situationFr=situationFr,
#             situationAr=situationAr,
#             # planDate=planDate,
#             mappeCadre=mappeCadre,
#             mappeReperage=mappeReperage,
#             titreOrigine=titreOrigine,
#             surface=surface,
#             natureTravail=natureTravail,
#             numeroSd=numeroSd,
#             # dateMec=dateMec,
#             serviceCadastre=serviceCadastre,
#             consistance=consistance,
#             charges=charges,
#             empietement=empietement,
#             surfaceEmpietement=surfaceEmpietement,
#             nometprenom=nometprenom,
#             cin=cin,
#             qualite=qualite
#         )

#         db.add(affaire)
#         db.commit()
#         db.refresh(affaire)
#     except Exception as e:
#         db.rollback()
#         raise HTTPException(status_code=400, detail=str(e))
#     finally:
#         db.close()
   

#     return {"message": "Affaire enregistrée avec succès", "id": affaire.id}





















# from fastapi import FastAPI, Depends
# from sqlalchemy.orm import Session
# from database import SessionLocal, engine
# from models import Base, Person
# from schemas import PersonCreate
# import psycopg2  # ✅ Manquait ici !

# Base.metadata.create_all(bind=engine)
# app = FastAPI()

# # Dependency
# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()

# @app.post("/person", status_code=201)
# def create_person(person: PersonCreate, db: Session = Depends(get_db)):
#     try:
#         conn = psycopg2.connect(
#             dbname="db_cadastre_mec",
#             user="postgres",
#             password="geoinfo",
#             host="localhost",
#             port="5432"
#         )
#         cur = conn.cursor()
#         cur.execute(
#             "INSERT INTO persons (nom, prenom, email) VALUES (%s, %s, %s)",
#             (person.nom, person.prenom, person.email)
#         )
#         conn.commit()
#         cur.close()
#         conn.close()
#         return {"message": "Personne ajoutée avec succès."}
#     except Exception as e:
#         print("Erreur DB :", e)
#         return {"message": "Erreur lors de l'ajout."}




from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, Person, Affaire, Image
from schemas import PersonCreate, AffaireCreate, ImageCreate
import logging
from fastapi.middleware.cors import CORSMiddleware 
from fastapi import FastAPI, UploadFile, File
import shapefile
import zipfile
import os, shutil
import json


# Création de l'application FastAPI
app = FastAPI()

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

# @app.post("/person", status_code=201)
# def create_person(person: PersonCreate, db: Session = Depends(get_db)):
#     try:
#         # Vérification si l'email existe déjà
#         existing_person = db.query(Person).filter(Person.email == person.email).first()
#         if existing_person:
#             raise HTTPException(
#                 status_code=400,
#                 detail="Cet email est déjà utilisé"
#             )

#         db_person = Person(
#             nom=person.nom,
#             prenom=person.prenom,
#             email=person.email
#         )
#         db.add(db_person)
#         db.commit()
#         db.refresh(db_person)
#         return {
#             "message": "Personne ajoutée avec succès.",
#             "id": db_person.id,
#             "nom": db_person.nom,
#             "prenom": db_person.prenom
#         }
#     except HTTPException:
#         raise  # On relève les HTTPException déjà gérées
#     except Exception as e:
#         db.rollback()
#         logger.error(f"Erreur DB : {str(e)}", exc_info=True)
#         raise HTTPException(
#             status_code=500,
#             detail="Erreur interne du serveur lors de la création"
#         )

# Point de terminaison pour vérifier que l'API fonctionne
# @app.get("/health")
# def health_check():
#     return {"status": "OK"}

# # Exécution de l'application
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
















# Création de l'application FastAPI
# app = FastAPI()

# # Configuration CORS - Doit venir APRÈS la création de l'app
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # À restreindre en production
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Configuration du logging
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# # Création des tables
# Base.metadata.create_all(bind=engine)

# # Dépendance pour la base de données
# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()

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


@app.post("/upload-shapefile/")
async def upload_shapefile(file: UploadFile = File(...)):
    # Enregistrer temporairement le ZIP
    zip_path = f"temp/{file.filename}"
    os.makedirs('temp', exist_ok=True)
    with open(zip_path, "wb") as f:
        f.write(await file.read())

    # Extraire le ZIP
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall("temp/extracted")

      # ✅ Chercher le fichier .shp dans tous les sous-dossiers
    shp_file = None
    for root, dirs, files in os.walk("temp/extracted"):
        for f_name in files:
            if f_name.endswith('.shp'):
                shp_file = os.path.join(root, f_name)
                break
        if shp_file:
            break

    if not shp_file:
        return {"error": "Fichier .shp non trouvé dans le ZIP."}

    sf = shapefile.Reader(shp_file)
    # Trouver le fichier SHP
    # shp_file = [f for f in os.listdir("temp/extracted") if f.endswith('.shp')]
    # if not shp_file:
    #     return {"error": "Shapefile non trouvé dans le ZIP"}

    # shp_path = f"temp/extracted/{shp_file[0]}"

    # # Lire le shapefile
    # sf = shapefile.Reader(shp_path)
    fields = [field[0] for field in sf.fields[1:]]  # ignorer le premier champ de suppression

    features = []
    for sr in sf.shapeRecords():
        if sr.shape.shapeType == shapefile.NULL:
            continue  # Ignorer les entités sans géométrie
        try:
            geom = sr.shape.__geo_interface__
            props = dict(zip(fields, sr.record))
            features.append({
                "type": "Feature",
                "geometry": geom,
                "properties": props
            })
        except Exception as e:
            print(f"Erreur lors du traitement d'une entité : {e}")
            continue

    geojson = {
        "type": "FeatureCollection",
        "features": features
    }

    # Nettoyer les fichiers temporaires
    os.remove(zip_path)
    shutil.rmtree("temp/extracted", ignore_errors=True)
    return geojson


# Point de terminaison pour vérifier que l'API fonctionne
@app.get("/health")
def health_check():
    return {"status": "OK"}

# Exécution de l'application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)






# @app.post("/upload-shapefile/")
# async def upload_shapefile(file: UploadFile = File(...)):
#     # Enregistrer temporairement le ZIP
#     zip_path = f"temp/{file.filename}"
#     os.makedirs('temp', exist_ok=True)
#     with open(zip_path, "wb") as f:
#         f.write(await file.read())

#     # Extraire le ZIP
#     with zipfile.ZipFile(zip_path, 'r') as zip_ref:
#         zip_ref.extractall("temp/extracted")

#       # ✅ Chercher le fichier .shp dans tous les sous-dossiers
#     shp_file = None
#     for root, dirs, files in os.walk("temp/extracted"):
#         for f_name in files:
#             if f_name.endswith('.shp'):
#                 shp_file = os.path.join(root, f_name)
#                 break
#         if shp_file:
#             break

#     if not shp_file:
#         return {"error": "Fichier .shp non trouvé dans le ZIP."}

#     sf = shapefile.Reader(shp_file)
#     # Trouver le fichier SHP
#     # shp_file = [f for f in os.listdir("temp/extracted") if f.endswith('.shp')]
#     # if not shp_file:
#     #     return {"error": "Shapefile non trouvé dans le ZIP"}

#     # shp_path = f"temp/extracted/{shp_file[0]}"

#     # # Lire le shapefile
#     # sf = shapefile.Reader(shp_path)
#     fields = [field[0] for field in sf.fields[1:]]  # ignorer le premier champ de suppression

#     features = []
#     for sr in sf.shapeRecords():
#         if sr.shape.shapeType == shapefile.NULL:
#             continue  # Ignorer les entités sans géométrie
#         try:
#             geom = sr.shape.__geo_interface__
#             props = dict(zip(fields, sr.record))
#             features.append({
#                 "type": "Feature",
#                 "geometry": geom,
#                 "properties": props
#             })
#         except Exception as e:
#             print(f"Erreur lors du traitement d'une entité : {e}")
#             continue

#     geojson = {
#         "type": "FeatureCollection",
#         "features": features
#     }

#     # Nettoyer les fichiers temporaires
#     os.remove(zip_path)
#     shutil.rmtree("temp/extracted", ignore_errors=True)
#     os.makedirs("temp/extracted", exist_ok=True)
#     return geojson