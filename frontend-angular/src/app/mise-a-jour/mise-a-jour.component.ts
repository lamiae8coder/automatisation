  import { Component, ViewChild, ElementRef } from '@angular/core';
  import { HttpClient } from '@angular/common/http';
  import { FormBuilder, FormGroup, Validators } from '@angular/forms';
  import { MatSnackBar } from '@angular/material/snack-bar';
  import * as _moment from 'moment';
  import { Moment } from 'moment';
  import { MatDatepicker } from '@angular/material/datepicker';


  @Component({ 
    selector: 'app-mise-a-jour',
    templateUrl: './mise-a-jour.component.html',
    standalone: false, 
    styleUrls: ['./mise-a-jour.component.css']
  })
  export class MiseAJourComponent {

    affaireForm: FormGroup;

    services: string[] = ['RABAT HASSAN AGDAL RYAD', 'KENITRA', 'SALE', 'SIDI KACEM', 'TEMARA', 'KHEMISSET', 'TIFLET', 'SIDI SLIMANE', 'TAMESNA', 'ROMMANI', 'TANGER', 'TANGER BNI MAKADA'];
    consistances: string[] = [
      'RDC',
      'RDC + 1 ÉTAGE',
      'RDC + 2 ÉTAGES',
      'SOUS-SOL + RDC + 1 ÉTAGE'
    ];
    // liste des qualités proposées pour l'autocomplete
    qualites: string[] = ['Propriétaire', 'Copropriétaire', 'Représentant'];

    // images: { file: File | null, preview: string | null, type: string }[] = [
    //   { file: null, preview: null, type: '' }
    // ];
    images: Array<{ file: File, preview: string, name: string, type?: string, selected?: boolean }> = [];

    naturesTravail: string[] = ['Mise à jour', 'Morcellement'];


    // monthYearDisplay = '';
    // dateType: string = 'complete';
    // chosenMonthHandler(normalizedMonth: Moment, datepicker: MatDatepicker<Moment>) {
    //   this.monthYearDisplay = normalizedMonth.format('MM/YYYY');
    //   this.affaireForm.get('plandate')?.setValue(normalizedMonth.toDate());
    //   datepicker.close();
    // }

    dateType: string = 'complete';
    monthYearDisplay: string = '';


    



    constructor(private http: HttpClient, private fb: FormBuilder, private snackBar: MatSnackBar) {
      this.affaireForm = this.fb.group({
        titremec: ['', Validators.required],
        proprietefr: ['', Validators.required],
        proprietear: ['', Validators.required],
        situationfr: ['', Validators.required],
        situationar: ['', Validators.required],
        plandate: ['', Validators.required],
        mappecadre: ['', Validators.required],
        mappereperage: ['', Validators.required],
        titreorigine: ['', Validators.required],
        surface: ['', Validators.required],
        naturetravail: ['', Validators.required],
        numerosd: ['', Validators.required],
        datemec: ['', Validators.required],
        servicecadastre: ['', Validators.required],
        consistance: ['', Validators.required],
        charges: ['NEANT', Validators.required],
        empietement: ['', Validators.required],
        surfaceempietement: [0],
        qualite: ['', Validators.required],
        cin: ['', Validators.required],
        nometprenom: ['', Validators.required],
      });

      this.affaireForm.get('empietement')?.valueChanges.subscribe(value => {
        const surfaceControl = this.affaireForm.get('surfaceempietement');

        if (value === true) {
          surfaceControl?.setValidators([Validators.required]);
        } else {
          surfaceControl?.clearValidators();
          surfaceControl?.setValue(0); // vider si NON
        }

        surfaceControl?.updateValueAndValidity();
      });

      


    }
   
    chosenMonthHandler(normalizedMonth: moment.Moment, datepicker: any) {
      const dateWithDayOne = new Date(normalizedMonth.year(), normalizedMonth.month(), 1);

      // ✅ Mise à jour du champ plandate et flag partielle
      this.affaireForm.patchValue({
        plandate: dateWithDayOne,
        plandate_partielle: true
      });

      // ✅ Affichage texte
      this.monthYearDisplay = normalizedMonth.format('MM/YYYY');

      datepicker.close();
    }

   


    // Soumission du formulaire vers FastAPI
    onSubmit(): void {
      if (this.affaireForm.invalid) {
        alert("Veuillez remplir tous les champs.");
        return;
      }
      // if (this.images.length < 4) {
      //   alert("Veuillez ajouter au moins 4 photos.");
      //   return;
      // }

       const affaireData = this.affaireForm.value;
      // const formData = new FormData();
      // if (this.affaireForm.value.empietement === false) {
      //   this.affaireForm.patchValue({ surfaceempietement: 0 });
      // }
      

      // Ajouter les données textuelles dans FormData
      // for (const key in affaireData) {
      //   if (affaireData.hasOwnProperty(key)) {
      //     formData.append(key, affaireData[key]);
      //   }
      // }

        // ✅ Conversion manuelle des dates : datemec et plandate
      affaireData.datemec = this.formatDate(affaireData.datemec);
      affaireData.plandate = this.formatDate(affaireData.plandate);

        // Ajouter les champs du formulaire (en respectant les noms attendus par le backend)
      // for (const key in affaireData) {
      //   if (affaireData.hasOwnProperty(key)) {
      //     const value = affaireData[key];
      //     if (value instanceof Date) {
      //       formData.append(key, value.toISOString().split('T')[0]); // "YYYY-MM-DD"
      //     } else {
      //       formData.append(key, value);
      //     }

      //   }
      // }

      // for (const key in affaireData) {
      //   if (affaireData.hasOwnProperty(key)) {
      //     formData.append(key, affaireData[key]);
      //   }
      // }

      // Ajouter les images dans FormData
      // this.images.forEach((image, index) => {
      //   formData.append('images', image.file, image.name);
      //   formData.append(`image_types[${index}]`, image.type || 'Non défini');
      
      // });

      // this.images.forEach((image, index) => {
      //   formData.append('images', image.file, image.name);
      //   formData.append('image_types', image.type || 'Non défini');
      // });
      

      if (this.affaireForm.valid) {
        this.http.post('http://localhost:8000/affaire', this.affaireForm.value)
          .subscribe({
            next: (response: any) => {
              this.snackBar.open(`Succès! ID: ${response.id}`, 'Fermer', {duration: 3000});
              // this.affaireForm.reset();
            },
            error: (error) => {
              this.snackBar.open(`Erreur: ${error.error.detail || 'Erreur inconnue'}`, 'Fermer', {duration: 5000});
            }
          });
      }
 
      // Envoyer vers FastAPI
      // this.http.post('http://localhost:8000/affaires', formData).subscribe({
      //   next: (response: any) => {
      //     console.log("Réponse du serveur :", response);
      //     alert("Affaire enregistrée avec succès !");
      //     this.affaireForm.reset();
      //     this.images = [];
      //   },
      //   error: (err) => {
      //     console.error("Erreur :", err);
      //     alert("Erreur lors de l'enregistrement.");
      //   }
      // });
    }
    

    onFilesSelected(event: Event) {
      const input = event.target as HTMLInputElement;
      if (!input.files) return;
      const files = input.files;

      const maxToAdd = 6 - this.images.length;

      if (files.length > maxToAdd) {
        alert(`Vous pouvez ajouter au maximum ${maxToAdd} images.`);
      }

      // On boucle seulement sur les fichiers que l'on peut ajouter sans dépasser la limite
      for (let i = 0; i < Math.min(files.length, maxToAdd); i++) {
        const file = files[i];
        const reader = new FileReader();

        reader.onload = (e: any) => {
          this.images.push({
            file,
            preview: e.target.result,
            name: file.name,
            type: undefined,
            selected: false
          });
        };
        reader.readAsDataURL(file);
      }

      // Reset input pour permettre un re-upload du même fichier si besoin
      input.value = '';
    }



    // Clique sur une image pour sélectionner/désélectionner
    toggleSelectImage(index: number) {
      this.images[index].selected = !this.images[index].selected;
    }

    // Assigner un type aux images sélectionnées et déselectionner
    assignTypeToSelected(type: string) {
      this.images.forEach(img => {
        if (img.selected) {
          img.type = type;
          img.selected = false;
        }
      });
    }

    private formatDate(date: any): string {
      if (!date) return '';
      const d = new Date(date);
      return d.toISOString().split('T')[0]; // Renvoie "YYYY-MM-DD"
    }


    
    onlyNumber(event: KeyboardEvent): void {
      const charCode = event.key;

      // Empêche tout caractère qui n’est pas un chiffre
      if (!/^[0-9]$/.test(charCode)) {
        event.preventDefault();
      }
    }
    
    submit(): boolean {
      return this.images.length >= 4 && this.images.length <= 6;
    }
    clearAllImages() {
      this.images = [];
    }



  }

