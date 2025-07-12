import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-nature-dialog',
  standalone: false,
  templateUrl: './nature-dialog.component.html',
  styleUrl: './nature-dialog.component.css'
})
export class NatureDialogComponent {
  selectedNature = '';
  customNature = '';
  selectedConsistance = '';
  showCustomInput = false;

  consistanceOptions: string[] = [
    'RDC',
    'RDC + 1 ÉTAGE',
    'RDC + 2 ÉTAGES',
    'SOUS-SOL + RDC + 1 ÉTAGE'
  ]; 

  constructor(
    public dialogRef: MatDialogRef<NatureDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { current: string, options: string[], type?: string } // type optionnel
  ) {}

  onNatureChange() {
    this.showCustomInput = this.selectedNature === 'Autre';
  }

  confirm() {
    // const finalNature = this.selectedNature === 'Autre' ? this.customNature.trim() : this.selectedNature;
    // this.dialogRef.close(finalNature || null);
    const finalNature = this.selectedNature === 'Autre' ? this.customNature.trim() : this.selectedNature;

    // Si on a une consistance, renvoyer un objet avec nature + consistance
    if (this.data.type === 'polygon') {
      this.dialogRef.close({
        nature: finalNature || null,
        consistance: this.selectedConsistance || null
      });
    } else {
      this.dialogRef.close(finalNature || null);
    }
  }

  cancel() {
    this.dialogRef.close(null);
  }
}
