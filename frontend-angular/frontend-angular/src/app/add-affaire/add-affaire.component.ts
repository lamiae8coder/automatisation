import { Component } from '@angular/core';
import { AffaireProgressService } from '../services/affaire-progress.service'; 
import { FormBuilder, FormGroup, Validators } from '@angular/forms';  // import des outils de formulaire

@Component({
  selector: 'app-add-affaire',
  standalone: false,
  templateUrl: './add-affaire.component.html',
  styleUrl: './add-affaire.component.css'
})


export class AddAffaireComponent {
  constructor(public progressService: AffaireProgressService) {}
  affaireForm!: FormGroup;
  previews: { preview: string; selected: boolean; type?: string }[] = [];
  onSubmit() {
  // … validation du formulaire
  if (this.affaireForm.valid) {
      // enregistre les données
      this.checkIfStep1Complete();
    }
  }

  submitForm() {
    // … upload des images
    this.checkIfStep1Complete();
  }

  checkIfStep1Complete() {
    if (this.affaireForm.valid && this.previews.length > 0) {
      this.progressService.markStep1Completed();
    }
  }



}
