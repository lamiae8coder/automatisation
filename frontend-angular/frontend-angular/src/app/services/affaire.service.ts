// affaire.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class AffaireService {
  

  constructor(private http: HttpClient) {}

  private _affaireId: number | null = null;
  private _affaireData: any = null; // 👈 nouvelle propriété
  private savedState: any;
  private baseUrl = '/api/affaires'; 
  setAffaireId(id: number) {
    this._affaireId = id;
  }

  getAffaireId(): number | null {
    return this._affaireId;
  }
  setState(state: any) {
    this.savedState = state;
  }

  getState() {
    return this.savedState;
  }
  setAffaireData(data: any) {
    this._affaireData = data;
  }

  getAffaireData(): any {
    return this._affaireData;
  }

  clearAffaireData() {
    this._affaireData = null;
    this._affaireId = null;
  }

  getAffaireDetails(id: number): Observable<{ id: number; titremec: string }> {
    return this.http.get<{ id: number; titremec: string }>(`http://127.0.0.1:8000/affaires/${id}`);
  }

  // Pour sauvegarder les données d'affaire (existant chez toi)
  saveAffaire(affaireData: any) {
    return this.http.post(`${this.baseUrl}`, affaireData);
  }

  // Pour envoyer les images associées à une affaire
  uploadAffaireImages(affaireId: number, images: Array<{ file: File, type: string }>) {
    const formData = new FormData();

    formData.append('affaire_id', affaireId.toString());

    images.forEach((img, idx) => {
      formData.append(`files`, img.file, img.file.name);
      formData.append(`types`, img.type);  // pour associer le type de chaque image
    });

    return this.http.post(`${this.baseUrl}/${affaireId}/images`, formData);
  }
}
