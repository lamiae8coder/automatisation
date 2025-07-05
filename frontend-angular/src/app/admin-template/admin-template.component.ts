import { Component, OnInit, ViewChild} from '@angular/core';
import { MatMenu } from '@angular/material/menu';
import { AuthenticationService } from '../services/authentication.service';
@Component({
  selector: 'app-admin-template',
  standalone: false,
  templateUrl: './admin-template.component.html',
  styleUrl: './admin-template.component.css'
})
export class AdminTemplateComponent implements OnInit{
  students: any[] = [];

  constructor(public authService : AuthenticationService){}
  
  ngOnInit(): void {
    
  }
  logout(){
    this.authService.logout();
  }
  @ViewChild('importMenu') importMenu!: MatMenu; 
}
