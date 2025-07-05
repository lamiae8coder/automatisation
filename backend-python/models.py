from sqlalchemy import Column, Integer, Numeric, String, Date, Float, Boolean, ForeignKey
from database import Base

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
    file_path = Column(String, nullable=False)
    type = Column(String, nullable=False)








