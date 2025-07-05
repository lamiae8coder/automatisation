from sqlalchemy.orm import Session
import models
import schemas

# def create_affaire(db: Session, affaire: schemas.AffaireCreate):
#     db_affaire = models.Affaire(**affaire.dict())
#     db.add(db_affaire)
#     db.commit()
#     db.refresh(db_affaire)
#     return db_affaire