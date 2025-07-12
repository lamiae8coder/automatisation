  import { Component, ViewChild, ElementRef } from '@angular/core';
  import { HttpClient } from '@angular/common/http';
  import { FormBuilder, FormGroup, Validators } from '@angular/forms';
  import { MatSnackBar } from '@angular/material/snack-bar';
  import * as _moment from 'moment';
  import { Moment } from 'moment';
  import { MatDatepicker } from '@angular/material/datepicker';
import { AffaireService } from '../services/affaire.service';




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
    imageData = {
      affaire_id: null,
      type: '',
      file: null as File | null
    };


    
    imageForm: FormGroup;
    selectedFile: File | null = null;
    confirmationMessage: string = '';

    files: File[] = [];
    types: string[] = [];
    affaireIdCreated: number | null = null;
    uploadedImagePaths: string[] = [];
    // previews: { preview: string; name: string; type?: string }[] = [];
    previews: { preview: string; name: string; type?: string; selected: boolean }[] = [];

    selectedIndex: number | null = null;

    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;


    constructor(private http: HttpClient,private affaireService: AffaireService, private fb: FormBuilder, private snackBar: MatSnackBar) {
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

      this.imageForm = this.fb.group({
        affaire_id: ['']
      });

      


    } 

    
    // submitForm() {
    //   const formData = new FormData();
    //   formData.append('affaire_id', this.imageForm.get('affaire_id')?.value);
    //   formData.append('type', this.imageForm.get('type')?.value);
    //   if (this.selectedFile) {
    //     formData.append('file', this.selectedFile);
    //   }

    //   this.http.post<any>('http://localhost:8000/addImageFD', formData)
    //     .subscribe({
    //       next: res => this.confirmationMessage = res.message,
    //       error: err => this.confirmationMessage = 'Erreur lors de l\'upload'
    //     });
    // }

    onFileSelected(event: any) {
      const file = event.target.files[0];
      if (file) {
        this.selectedFile = file;
      }
    }

    selectImage(index: number) {
      this.selectedIndex = index;
    }

    // assignTypeToSelected(type: string) {
    //   if (this.selectedIndex !== null) {
    //     this.types[this.selectedIndex] = type;
    //     this.previews[this.selectedIndex].type = type;
    //   }
    // }
    
    assignTypeToSelected(type: string): void {
      this.previews.forEach((img, i) => {
        if (img.selected) {
          img.type = type;
          this.types[i] = type;
          img.selected = false; // facultatif : on peut désélectionner après affectation
        }
      });
    }


 

        
    submitForm() {
      if (!this.affaireIdCreated) {
        alert("Veuillez d'abord enregistrer une affaire avant d'ajouter des images.");
        return;
      }
      const formData = new FormData();
      formData.append('affaire_id', this.affaireIdCreated.toString());


       // Vérification manuelle
      // if (!this.types || this.types.length !== this.files.length || this.types.some(type => !type || type.trim() === '')) {
      //   alert("Veuillez remplir un type pour chaque image.");
      //   return;
      // }


      this.files.forEach((file, i) => {
        formData.append('files', file);       // tous les fichiers
        formData.append('types', this.types[i]); // tous les types dans le même ordre
      });

      this.http.post<any>('http://localhost:8000/addImageFD', formData)
        .subscribe({
          next: res => {
            this.confirmationMessage = res.message;
            // alert(res.message);
            this.snackBar.open(res.message, 'Fermer', {
              duration: 4000,
              panelClass: ['snackbar-success']  // Optionnel : pour styliser
            });

            this.uploadedImagePaths = res.images.map((img: any) => 'http://localhost:8000' + img.file_path);
            this.files = [];
            this.types = [];
            this.imageForm.reset();
          },
          error: err => {
            this.confirmationMessage = 'Erreur lors de l\'upload.';
          }
        });
    }


    onFileChange(event: any) {
      const file = event.target.files[0];
      if (file) {
        this.selectedFile = file;
      }
    }

    submitSimpleForm(): void {
      if (!this.selectedFile) {
        alert('Veuillez sélectionner une image.');
        return;
      }

      const formData = new FormData();
      formData.append('affaire_id', this.imageForm.value.affaire_id);
      formData.append('type', this.imageForm.value.image_type);
      formData.append('file_path', this.selectedFile);

      this.http.post('http://localhost:8000/image', formData).subscribe({
        next: (res) => {
          console.log('✅ Succès :', res);
        },
        error: (err) => {
          console.error('❌ Erreur :', err);
        }
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
    

       const affaireData = this.affaireForm.value;
    

        // ✅ Conversion manuelle des dates : datemec et plandate
      affaireData.datemec = this.formatDate(affaireData.datemec);
      affaireData.plandate = this.formatDate(affaireData.plandate);

        


      if (this.affaireForm.valid) {
        this.http.post('http://localhost:8000/affaire', this.affaireForm.value)
          .subscribe({
            next: (response: any) => {
              this.affaireIdCreated = response.id; 
              this.affaireService.setAffaireId(response.id);
              this.snackBar.open(`Succès! ID: ${response.id}`, 'Fermer', {duration: 3000});
              // this.affaireForm.reset();
            },
            error: (error) => {
              this.snackBar.open(`Erreur: ${error.error.detail || 'Erreur inconnue'}`, 'Fermer', {duration: 5000});
            }
          });
      }
 
   
    }

   


    onFilesSelected(event: any) {
      const selectedFiles = Array.from(event.target.files) as File[];
      this.files = selectedFiles;
      this.previews = [];
      this.types = selectedFiles.map(() => ''); // initialise les types vides
      this.files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.previews.push({
            preview: e.target.result,
            name: file.name,
            type: '',
            selected: false,
          });
        };
        reader.readAsDataURL(file);
      });
    }

    

    // Clique sur une image pour sélectionner/désélectionner
    toggleSelectImage(index: number) {
      this.images[index].selected = !this.images[index].selected;
    }

    toggleImageSelection(index: number): void {
      this.previews[index].selected = !this.previews[index].selected;
    }
    

    // Assigner un type aux images sélectionnées et déselectionner
    selectedType: string = '';
    // assignTypeToSelected(type: string) {
    //   this.selectedType = type;
    //   this.images.forEach(img => {
    //     if (img.selected) {
    //       img.type = type;
    //       img.selected = false;
    //     }
    //   });
    // }

    onImageSubmit() {
      if (!this.imageData.affaire_id || !this.imageData.type || !this.imageData.file) {
        alert("Tous les champs sont requis.");
        return;
      }

      const formData = new FormData();
      formData.append('affaire_id', String(this.imageData.affaire_id));
      formData.append('type', this.imageData.type);
      formData.append('file', this.imageData.file);

      this.http.post('http://127.0.0.1:8000/upload-image/', formData).subscribe({
        next: (res) => {
          alert('Image enregistrée avec succès !');
          this.imageData = { affaire_id: null, type: '', file: null };
        },
        error: (err) => {
          console.error(err);
          alert("Erreur lors de l'enregistrement de l’image.");
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
    // clearAllImages() {
    //   this.previews = [];
    // }


    clearAllImages() {
      this.previews = [];
      this.files = [];
      // Réinitialiser l’input file pour permettre un nouveau upload
      if (this.fileInput) {
        this.fileInput.nativeElement.value = '';
      }
    }

  }

