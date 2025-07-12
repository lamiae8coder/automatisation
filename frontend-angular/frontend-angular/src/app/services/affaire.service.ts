// affaire.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AffaireService {
  private _affaireId: number | null = null;

  setAffaireId(id: number) {
    this._affaireId = id;
  }

  getAffaireId(): number | null {
    return this._affaireId;
  }
}
