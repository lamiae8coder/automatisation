// import { Component, Inject } from '@angular/core';
// import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

// @Component({
//   selector: 'app-nature-dialog',
//   standalone: false,
//   templateUrl: './nature-dialog.component.html',
//   styleUrl: './nature-dialog.component.css'
// })
// export class NatureDialogComponent {
//   selectedNature = '';
//   customNature = '';
//   selectedConsistance = '';
//   showCustomInput = false;

//   consistanceOptions: string[] = [
//     'RDC',
//     'RDC + 1 ÉTAGE',
//     'RDC + 2 ÉTAGES',
//     'SOUS-SOL + RDC + 1 ÉTAGE'
//   ]; 

//   constructor(
//     public dialogRef: MatDialogRef<NatureDialogComponent>,
//     @Inject(MAT_DIALOG_DATA) public data: { current: string, options: string[], type?: string } // type optionnel
//   ) {}

//   onNatureChange() {
//     this.showCustomInput = this.selectedNature === 'Autre';
//   }

//   confirm() {
//     // const finalNature = this.selectedNature === 'Autre' ? this.customNature.trim() : this.selectedNature;
//     // this.dialogRef.close(finalNature || null);
//     const finalNature = this.selectedNature === 'Autre' ? this.customNature.trim() : this.selectedNature;

//     // Si on a une consistance, renvoyer un objet avec nature + consistance
//     if (this.data.type === 'polygon') {
//       this.dialogRef.close({
//         nature: finalNature || null,
//         consistance: this.selectedConsistance || null
//       });
//     } else {
//       this.dialogRef.close(finalNature || null);
//     }
//   }

//   cancel() {
//     this.dialogRef.close(null);
//   }
// }

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
  showCustomInput = false;

  // Liste des consistances avec leur nb_consistance
  consistances: { type: string, nb_consistance: number }[] = [
    { type: 'S/SOL', nb_consistance: 0 },
    { type: 'RDC', nb_consistance: 0 },
    { type: 'MEZZANINE', nb_consistance: 0 },
    { type: 'ÉTAGE', nb_consistance: 0 }
  ];

  constructor(
    public dialogRef: MatDialogRef<NatureDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { current: string, options: string[], type?: string, consistances?: any[] }
  ) {
    this.selectedNature = data.current || '';
    this.showCustomInput = this.selectedNature === 'Autre';

    if (data.consistances) {
      // Si déjà défini sur la feature, reprendre les valeurs existantes
      this.consistances = data.consistances.map(c => ({ ...c }));
    }
  }

  

  onNatureChange() {
    this.showCustomInput = this.selectedNature === 'Autre';
  }

  increment(cons: any) {
    cons.nb_consistance++;
  }

  decrement(cons: any) {
    if (cons.nb_consistance > 0) cons.nb_consistance--;
  }

  confirm() {
    const finalNature = this.selectedNature === 'Autre' ? this.customNature.trim() : this.selectedNature;

    this.dialogRef.close({
      nature: finalNature || null,
      consistances: this.consistances
    });
  }

  cancel() {
    this.dialogRef.close(null);
  }
}
 