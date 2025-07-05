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



# from pydantic import BaseModel, Field
# from datetime import date
# from typing import Optional
# from decimal import Decimal


# class AffaireBase(BaseModel):
#     titre_mec: str
#     propriete_fr: str
#     propriete_ar: str
#     situation_fr: str
#     situation_ar: str
#     plan_date: date
#     mappe_cadre: str
#     mappe_reperage: str
#     titre_origine: str
#     surface: Decimal
#     nature_travail: str
#     numero_sd: int
#     date_mec: date
#     service_cadastre: str
#     consistance: str
#     charges: str
#     empietement: bool
#     nom_prenom: str
#     cin: str
#     qualite: str

# class AffaireCreate(AffaireBase):
#     surfaceempietement: Optional[Decimal] = None

# class Affaire(AffaireBase):
#     id: int
#     surfaceempietement: Optional[Decimal]

#     class Config:
#         orm_mode = True