from pydantic import BaseModel, EmailStr
from decimal import Decimal
from datetime import date
from typing import Optional, List
from fastapi import Form, UploadFile, File


class PersonCreate(BaseModel):
    nom: str
    prenom: str
    email: EmailStr



class AffaireCreate(BaseModel):
    titremec: str
    proprietefr: str
    proprietear: str
    situationfr: str
    situationar: str
    plandate: date
    mappecadre: str
    mappereperage: str
    titreorigine: str
    surface: int
    naturetravail: str
    numerosd: int
    datemec: date
    servicecadastre: str
    consistance: str
    charges: str
    empietement: bool
    surfaceempietement: Optional[int] = None
    nometprenom: str
    cin: str
    qualite: str

   

class ImageCreate(BaseModel):
    affaire_id: int
    file_path: str
    type: str



class ShowImage(BaseModel):
    id: int
    affaire_id: int
    file_path: str
    type: str

    class Config:
        orm_mode = True