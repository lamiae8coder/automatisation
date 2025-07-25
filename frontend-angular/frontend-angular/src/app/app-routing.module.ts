import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ProfileComponent } from './profile/profile.component';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { StudentsComponent } from './students/students.component';
import { PaymentsComponent } from './payments/payments.component';
import { LoadPaymentsComponent } from './load-payments/load-payments.component';
import { LoadStudentsComponent } from './load-students/load-students.component';
import { AdminTemplateComponent } from './admin-template/admin-template.component';
import { AuthGuard } from './guards/auth.guard';
import { AuthorizationGuard } from './guards/authorization.guard';
import { MiseAJourComponent } from './mise-a-jour/mise-a-jour.component';
import { DessinExterieurComponent } from './dessin-exterieur/dessin-exterieur.component';
import { AddAffaireComponent } from './add-affaire/add-affaire.component';
import { ImporterDessinComponent } from './importer-dessin/importer-dessin.component';
import { Step2AccessGuard } from './guards/step2-access.guard';  

// const routes: Routes = [
//   {path : "", component : LoginComponent},
//   {path : "login", component : LoginComponent},
//   {path : "admin", component : AdminTemplateComponent, canActivate : [AuthGuard],

//     children : [
//     {path : "home", component : HomeComponent},
//     {path : "Ajouter une Nouvelle Affaire", component : ProfileComponent},
//     {path : "dashboard", component : DashboardComponent},
//     {path : "students", component : StudentsComponent},
//     {path : "payments", component : PaymentsComponent},
//     {path : "loadPayments", component : LoadPaymentsComponent, 
//       canActivate : [AuthorizationGuard], data : {roles : ['ADMIN']}}, 
//     {path : "add-affaire", component : AddAffaireComponent,canActivate : [AuthorizationGuard], data : {roles : ['ADMIN']},

//       children: [
//         {
//           path: "mise-a-jour",
//           component: MiseAJourComponent,
//           canActivate: [AuthorizationGuard],
//           data: { roles: ['ADMIN'] }
//         },
//         {
//           path: "dessin-exterieur",
//           component: DessinExterieurComponent,
//           canActivate: [AuthorizationGuard],
//           data: { roles: ['ADMIN'] }
//         },
//         {
//           path: "importer-dessin",
//           component: ImporterDessinComponent,
//           canActivate: [AuthorizationGuard],
//           data: { roles: ['ADMIN'] }
//         },
//         {
//           path: "",
//           redirectTo: "mise-a-jour",
//           pathMatch: "full"
//         }
//       ]
//     },
//     // {path : "mise-a-jour", component : MiseAJourComponent,
//     //   canActivate : [AuthorizationGuard], data : {roles : ['ADMIN']}},
//     // {path : "dessin-exterieur", component : DessinExterieurComponent,
//     //   canActivate : [AuthorizationGuard], data : {roles : ['ADMIN']}},
//   ]},
 
// ];




const routes: Routes = [
  { path: "", component: LoginComponent },
  { path: "login", component: LoginComponent },
  {
    path: "admin",
    component: AdminTemplateComponent,
    canActivate: [AuthGuard],
    children: [
      { path: "home", component: HomeComponent },
      { path: "Ajouter une Nouvelle Affaire", component: ProfileComponent },
      { path: "dashboard", component: DashboardComponent },
      { path: "students", component: StudentsComponent },
      {
        path: "payments",
        component: PaymentsComponent
      },
      {
        path: "loadPayments",
        component: LoadPaymentsComponent,
        canActivate: [AuthorizationGuard],
        data: { roles: ['ADMIN'] }
      },
      {
        path: "add-affaire",
        component: AddAffaireComponent,
        canActivate: [AuthorizationGuard],
        data: { roles: ['ADMIN'] },
        children: [
          {
            path: "mise-a-jour",
            component: MiseAJourComponent,
            canActivate: [AuthorizationGuard],
            data: { roles: ['ADMIN'] }
          },
          {
            path: "dessin-exterieur",
            component: DessinExterieurComponent,
            canActivate: [AuthorizationGuard, Step2AccessGuard],  // <-- ici on ajoute le guard personnalisé
            data: { roles: ['ADMIN'] }
          },
          {
            path: "importer-dessin",
            component: ImporterDessinComponent,
            canActivate: [AuthorizationGuard],
            data: { roles: ['ADMIN'] }
          },
          {
            path: "",
            redirectTo: "mise-a-jour",
            pathMatch: "full"
          }
        ]
      },
    ]
  }
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
