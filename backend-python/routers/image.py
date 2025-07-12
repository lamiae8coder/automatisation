from fastapi import APIRouter, UploadFile, File, Form, Depends, status
from sqlalchemy.orm import Session
import os
import uuid
from typing import List
from models import Image  # SQLAlchemy model
from database import get_db
from schemas import ShowImage  # Pydantic response model

router = APIRouter()



def generate_filename(filename):
    ext = os.path.splitext(filename)[1]
    return f"{uuid.uuid4().hex}{ext}"



# @router.post("/addImageFD", status_code=status.HTTP_201_CREATED, response_model=ShowImage)
# async def add_image(
#     affaire_id: int = Form(...),
#     type: str = Form(...),
#     file: UploadFile = File(...),
#     db: Session = Depends(get_db)
# ):
#     try:
#         # Dossier où stocker l'image
#         upload_dir = "uploads/"
#         os.makedirs(upload_dir, exist_ok=True)

#         # Créer un nom unique pour l’image
#         filename = generate_filename(file.filename)
#         image_path = os.path.join(upload_dir, filename)

#         # Lire et enregistrer le fichier
#         contents = await file.read()
#         with open(image_path, "wb") as f:
#             f.write(contents)

#         # Stocker le chemin (ex: en URL accessible depuis Angular)
#         public_path = f"/uploads/{filename}"

#         # Création dans la base
#         new_image = Image(
#             affaire_id=affaire_id,
#             file_path=public_path,
#             type=type
#         )
#         db.add(new_image)
#         db.commit()
#         db.refresh(new_image)

#         return new_image

#     except Exception as e:
#         return {"message": "Erreur d'envoi de l'image", "details": str(e)}
#     finally:
#         await file.close()


@router.post("/addImageFD")
async def add_multiple_images(
    affaire_id: int = Form(...),
    files: List[UploadFile] = File(...),
    types: List[str] = Form(...),
    db: Session = Depends(get_db)
):
    if len(files) != len(types):
        return {"message": "Nombre de fichiers et types ne correspond pas"}

    upload_dir = "uploads/"
    os.makedirs(upload_dir, exist_ok=True)

    saved_images = []

    for file, type_str in zip(files, types):
        filename = generate_filename(file.filename)
        image_path = os.path.join(upload_dir, filename)

        contents = await file.read()
        with open(image_path, "wb") as f:
            f.write(contents)

        public_path = f"/uploads/{filename}"

        new_image = Image(
            affaire_id=affaire_id,
            file_path=public_path,
            type=type_str
        )
        db.add(new_image)
        db.commit()
        db.refresh(new_image)
        saved_images.append(new_image)

        await file.close()

    return {
        "message": f"{len(saved_images)} image(s) enregistrée(s) avec succès.",
        "images": saved_images
    }
