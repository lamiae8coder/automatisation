from sqlalchemy import Column, Integer, Numeric,Text, String, Date,JSON, Float, Boolean, ForeignKey
from database import Base
from geoalchemy2 import Geometry
from sqlalchemy.orm import relationship



class Person(Base):
    __tablename__ = "persons"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    prenom = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)

    
class Affaire(Base):
    __tablename__ = "affaires"

    id = Column(Integer, primary_key=True, index=True)
    titremec = Column(String, nullable=False)
    proprietefr = Column(String, nullable=False)
    proprietear = Column(String, nullable=False)
    situationfr = Column(String, nullable=False)
    situationar = Column(String, nullable=False)
    mappecadre = Column(String, nullable=False)
    mappereperage = Column(String, nullable=False)
    titreorigine = Column(String, nullable=False)
    nometprenom = Column(String, nullable=False)
    cin = Column(String, nullable=False)
    plandate = Column(Date, nullable=False)
    datemec = Column(Date, nullable=False)
    surface = Column(Integer, nullable=False)
    numerosd = Column(Integer, nullable=False)
    empietement = Column(Boolean, nullable=False)
    surfaceempietement = Column(Integer, nullable=True)
    naturetravail = Column(String(100), nullable=False)
    servicecadastre = Column(String(100), nullable=False)
    qualite = Column(String(200), nullable=False)
    consistance = Column(String(500), nullable=False)
    charges = Column(String(500), nullable=False)


class Image(Base):
    __tablename__ = "images"
    id = Column(Integer, primary_key=True, index=True)
    affaire_id = Column(Integer, nullable=False)
    file_path = Column(String(500), nullable=False)
    type = Column(String(500), nullable=False)
    geom = Column(Geometry(geometry_type='POINT', srid=26191))



class DesignatedShape(Base):
    __tablename__ = "designated_shapes"
    id = Column(Integer, primary_key=True, index=True)
    affaire_id = Column(Integer, nullable=False)
    source_file = Column(String(500), nullable=False)
    geom = Column(Geometry(geometry_type='POLYGON', srid=26191))



class ImportedShapefile(Base):
    __tablename__ = "imported_shapefiles"

    id = Column(Integer, primary_key=True, index=True)
    affaire_id = Column(Integer, nullable=False, index=True)
    file_name = Column(String(500), nullable=True)
    geom = Column(Geometry(geometry_type='MULTIPOLYGON', srid=26191))
    


class PointsLayer(Base):
    __tablename__ = 'points_layer'
    id = Column(Integer, primary_key=True, index=True)
    affaire_id = Column(Integer, nullable=False)
    geom = Column(Geometry(geometry_type='POINT', srid=26191))

class PolygonesLayer(Base):
    __tablename__ = 'polygones_layer'
    id = Column(Integer, primary_key=True, index=True)
    affaire_id = Column(Integer, nullable=False)
    geom = Column(Geometry(geometry_type='POLYGON', srid=26191))

class LignesLayer(Base):
    __tablename__ = 'lignes_layer'
    id = Column(Integer, primary_key=True, index=True)
    affaire_id = Column(Integer, nullable=False)
    geom = Column(Geometry(geometry_type='LINESTRING', srid=26191))


class PointsLayerMec(Base):
    __tablename__ = 'points_layer_mec'
    id = Column(Integer, primary_key=True, index=True)
    affaire_id = Column(Integer, nullable=False)
    type_mec = Column(String(100), nullable=True)
    geom = Column(Geometry(geometry_type='POINT', srid=26191))

class PolygonesLayerMec(Base):
    __tablename__ = 'polygones_layer_mec'
    id = Column(Integer, primary_key=True, index=True)
    affaire_id = Column(Integer, nullable=False)
    type_mec = Column(String(100), nullable=True)
    geom = Column(Geometry(geometry_type='POLYGON', srid=26191))
    nature = Column(String(255), nullable=True)
    consistances = Column(Text, nullable=True)

class LignesLayerMec(Base):
    __tablename__ = 'lignes_layer_mec'
    id = Column(Integer, primary_key=True, index=True)
    affaire_id = Column(Integer, nullable=False)
    type_mec = Column(String(100), nullable=True)
    geom = Column(Geometry(geometry_type='LINESTRING', srid=26191))