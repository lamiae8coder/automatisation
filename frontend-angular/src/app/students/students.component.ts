// import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
// import { MatPaginator } from '@angular/material/paginator';
// import { MatTableDataSource } from '@angular/material/table';
// import { MatSort } from '@angular/material/sort';
// import { AnyCatcher } from 'rxjs/internal/AnyCatcher';
// import { Router } from '@angular/router';
// import { StudentService } from '../services/student.service';
// import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { HttpClient } from '@angular/common/http';

// @Component({
//   selector: 'app-students',
//   standalone: false, 
//   templateUrl: './students.component.html',
//   styleUrl: './students.component.css'
// })
// export class StudentsComponent implements OnInit, AfterViewInit{

//   public students: any = [];
//   public dataSource : any;
//   public displayedColumns = ["id","firstName","lastName","payments"];
  
//   @ViewChild(MatPaginator) paginator! : MatPaginator;
//   @ViewChild(MatSort) sort! : MatSort;

//   // constructor(private router : Router, private studentService: StudentService){

//   // } 
//   ngOnInit(): void {
//     // this.loadStudents();

//   }
//   ngAfterViewInit(): void {
//     this.dataSource.paginator=this.paginator;
//     this.dataSource.sort=this.sort;

//   }

//   // loadStudents(): void {
//   //   this.studentService.getStudents().subscribe({
//   //     next: (data) => {
//   //       this.students = data.map((student: any) => ({
//   //         id: student.id,
//   //         firstName: student.name,
//   //         lastName: student.email
//   //       }));
//   //       this.dataSource = new MatTableDataSource(this.students);
//   //       this.dataSource.paginator = this.paginator;
//   //       this.dataSource.sort = this.sort;
//   //     },
//   //     error: (err) => {
//   //       console.error('Erreur lors du chargement des étudiants', err);
//   //     }
//   //   });
//   // }
//   // filterStudents(event: Event): void {
//   //   let value : string = (event.target as HTMLInputElement).value;
//   //   this.dataSource.filter = value;
//   // }
//   // getPayments(student : any): void {
//   //   this.router.navigateByUrl("/admin/payments")
//   // }


//   personForm: FormGroup;

//   constructor(private fb: FormBuilder, private http: HttpClient) {
//     this.personForm = this.fb.group({
//       nom: ['', Validators.required],
//       prenom: ['', Validators.required],
//       email: ['', [Validators.required, Validators.email]]
//     });
//   }

//   onSubmit() {
//     if (this.personForm.valid) {
//       this.http.post('http://localhost:8000/person', this.personForm.value)
//         .subscribe({
//           next: () => alert('Données envoyées avec succès !'),
//           error: () => alert('Erreur lors de l\'envoi.')
//         });
//     }
//   }
  
// }








import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-students',
  templateUrl: './students.component.html',
  styleUrls: ['./students.component.css'],
  standalone: false,
  // imports: [MatFormFieldModule, MatInputModule, MatButtonModule]
})
export class StudentsComponent {
  personForm: FormGroup;

  constructor(
    private fb: FormBuilder, 
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    this.personForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    if (this.personForm.valid) {
      this.http.post('http://localhost:8000/person', this.personForm.value)
        .subscribe({
          next: (response: any) => {
            this.snackBar.open(`Succès! ID: ${response.id}`, 'Fermer', {duration: 3000});
            this.personForm.reset();
          },
          error: (error) => {
            this.snackBar.open(`Erreur: ${error.error.detail || 'Erreur inconnue'}`, 'Fermer', {duration: 5000});
          }
        });
    }
  }
}