import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AffaireProgressService {
  private step1Completed = false;
  private step2Completed = false;
  private step3Completed = false;
  private step4Completed = false;

  // Vérifications des étapes
  isStep1Completed(): boolean {
    return this.step1Completed;
  }
  isStep2Completed(): boolean {
    return this.step2Completed;
  }
  isStep3Completed(): boolean {
    return this.step3Completed;
  }
  isStep4Completed(): boolean {
    return this.step4Completed;
  }

  // Marquer étapes comme terminées
  markStep1Completed() {
    this.step1Completed = true;
  }
  markStep2Completed() {
    this.step2Completed = true;
  }
  markStep3Completed() {
    this.step3Completed = true;
  }
  markStep4Completed() {
    this.step4Completed = true;
  }

  // Réinitialiser progression
  resetProgress() {
    this.step1Completed = false;
    this.step2Completed = false;
    this.step3Completed = false;
    this.step4Completed = false;
  }
}
 