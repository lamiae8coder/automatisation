import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {MatToolbar, MatToolbarModule} from '@angular/material/toolbar';;
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatHeaderCellDef, MatCellDef, MatRowDef } from '@angular/material/table';
import { AdminTemplateComponent } from './admin-template/admin-template.component';
import { HomeComponent } from './home/home.component';
import { ProfileComponent } from './profile/profile.component';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { StudentsComponent } from './students/students.component';
import { PaymentsComponent } from './payments/payments.component';
import { LoadStudentsComponent } from './load-students/load-students.component';
import { LoadPaymentsComponent } from './load-payments/load-payments.component';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthGuard } from './guards/auth.guard';
import { AuthorizationGuard } from './guards/authorization.guard';
import { HttpClientModule } from '@angular/common/http';
import { MiseAJourComponent } from './mise-a-jour/mise-a-jour.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDateFormats } from '@angular/material/core';
import { DateAdapter} from '@angular/material/core';
import { MAT_DATE_LOCALE, MAT_DATE_FORMATS } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { FormsModule } from '@angular/forms';
import { SocieteInfoComponent } from './societe-info/societe-info.component';
import { MatRadioModule } from '@angular/material/radio';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { DessinExterieurComponent } from './dessin-exterieur/dessin-exterieur.component';
import { AddAffaireComponent } from './add-affaire/add-affaire.component';
import { MatDialogModule } from '@angular/material/dialog';
import { FeatureModalComponent } from './feature-modal/feature-modal.component';
import { ImporterDessinComponent } from './importer-dessin/importer-dessin.component';
import { NatureDialogComponent } from './nature-dialog/nature-dialog.component';
import { RouterModule } from '@angular/router';
import { MapComponent } from './map/map.component';

export const FRENCH_DATE_FORMATS = {
  parse: {
    dateInput: 'DD MMMM YYYY',
  },
  display: {
    dateInput: 'dd MMMM yyyy',
    monthYearLabel: 'MMMM yyyy',
    dateA11yLabel: 'dd MMMM yyyy',
    monthYearA11yLabel: 'MMMM yyyy',
  },
};


@NgModule({
  declarations: [
    AppComponent, 
    AdminTemplateComponent,
    HomeComponent,
    ProfileComponent,
    LoginComponent,
    DashboardComponent,
    StudentsComponent,
    PaymentsComponent,
    LoadStudentsComponent,
    LoadPaymentsComponent,
    MiseAJourComponent,
    SocieteInfoComponent,
    DessinExterieurComponent,
    AddAffaireComponent,
    FeatureModalComponent,
    ImporterDessinComponent,
    NatureDialogComponent,
    MapComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    BrowserAnimationsModule,
    MatSidenavModule,
    MatListModule,
    MatCardModule,
    MatDividerModule,
    MatHeaderCellDef,
    MatCellDef, 
    MatRowDef, 
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    HttpClientModule, 
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule, 
    MatNativeDateModule,  
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    FormsModule,
    MatSelectModule,
    ReactiveFormsModule , 
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,  
    FormsModule,
    ReactiveFormsModule,
    MatRadioModule,
    MatMomentDateModule,
    MatDialogModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    RouterModule
    
    
  ],
  providers: [
    AuthGuard, AuthorizationGuard,
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },
    { provide: MAT_DATE_FORMATS, useValue: FRENCH_DATE_FORMATS }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
