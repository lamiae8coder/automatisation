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

    # Créer une liste de tuples (file, type) pour pouvoir les trier ensemble
    file_type_pairs = list(zip(files, types))

    # Fonction pour déterminer si un type est défini
    def has_defined_type(type_str):
        return (type_str and 
                type_str.strip() and 
                type_str.strip().lower() not in ["non défini", "non defini", "", "none", "null"])

    # Séparer les images avec type défini et sans type défini
    images_with_type = [(file, type_str) for file, type_str in file_type_pairs if has_defined_type(type_str)]
    images_without_type = [(file, type_str) for file, type_str in file_type_pairs if not has_defined_type(type_str)]

    # Trier les images avec type par ordre alphabétique du type
    images_with_type.sort(key=lambda pair: pair[1].lower())

    # Optionnel : Si vous voulez un ordre spécifique de types, décommentez et modifiez :
    # type_order = ["façade", "terrasse", "la cour", "plan", "photo", "croquis"]
    # images_with_type.sort(key=lambda pair: (
    #     type_order.index(pair[1].lower()) 
    #     if pair[1].lower() in type_order 
    #     else len(type_order)
    # ))

    # Combiner dans l'ordre souhaité : d'abord avec type, puis sans type
    sorted_file_type_pairs = images_with_type + images_without_type

    # Debug : Afficher l'ordre de traitement (optionnel, à supprimer en production)
    print(f"Ordre d'enregistrement des images:")
    for i, (file, type_str) in enumerate(sorted_file_type_pairs, 1):
        print(f"  {i}. {file.filename} - Type: {type_str}")

    saved_images = []

    # Traiter les images dans l'ordre trié
    for file, type_str in sorted_file_type_pairs:
        try:
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

        except Exception as e:
            print(f"Erreur lors du traitement de {file.filename}: {str(e)}")
            # Optionnel : vous pouvez décider de continuer ou d'arrêter en cas d'erreur
            continue

    return {
        "message": f"{len(saved_images)} image(s) enregistrée(s) avec succès dans l'ordre trié.",
        "images": saved_images,
        "ordre_enregistrement": {
            "images_avec_type": len(images_with_type),
            "images_sans_type": len(images_without_type),
            "total": len(saved_images)
        }
    }



# @router.post("/addImageFD")
# async def add_multiple_images(
#     affaire_id: int = Form(...),
#     files: List[UploadFile] = File(...),
#     types: List[str] = Form(...),
#     db: Session = Depends(get_db)
# ):
#     if len(files) != len(types):
#         return {"message": "Nombre de fichiers et types ne correspond pas"}

#     upload_dir = "uploads/"
#     os.makedirs(upload_dir, exist_ok=True)

#     saved_images = []

#     for file, type_str in zip(files, types):
#         filename = generate_filename(file.filename)
#         image_path = os.path.join(upload_dir, filename)

#         contents = await file.read()
#         with open(image_path, "wb") as f:
#             f.write(contents)

#         public_path = f"/uploads/{filename}"

#         new_image = Image(
#             affaire_id=affaire_id,
#             file_path=public_path,
#             type=type_str
#         )
#         db.add(new_image)
#         db.commit()
#         db.refresh(new_image)
#         saved_images.append(new_image)

#         await file.close()

#     return {
#         "message": f"{len(saved_images)} image(s) enregistrée(s) avec succès.",
#         "images": saved_images
#     }
