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

const routes: Routes = [
  {path : "", component : LoginComponent},
  {path : "login", component : LoginComponent},
  {path : "admin", component : AdminTemplateComponent, canActivate : [AuthGuard],

    children : [
    {path : "home", component : HomeComponent},
    {path : "Ajouter une Nouvelle Affaire", component : ProfileComponent},
    {path : "dashboard", component : DashboardComponent},
    {path : "students", component : StudentsComponent},
    {path : "payments", component : PaymentsComponent},
    {path : "loadPayments", component : LoadPaymentsComponent, 
      canActivate : [AuthorizationGuard], data : {roles : ['ADMIN']}}, 
    {path : "mise-a-jour", component : MiseAJourComponent,
      canActivate : [AuthorizationGuard], data : {roles : ['ADMIN']}},
    {path : "dessin-exterieur", component : DessinExterieurComponent,
      canActivate : [AuthorizationGuard], data : {roles : ['ADMIN']}},
  ]},
 
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
