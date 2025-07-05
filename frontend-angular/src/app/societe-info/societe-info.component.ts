import { Component, OnInit } from '@angular/core';
import { SocieteService } from '../services/societe.service';
 
@Component({
  selector: 'app-societe-info',
  standalone: false,
  templateUrl: './societe-info.component.html',
  styleUrl: './societe-info.component.css'
})
export class SocieteInfoComponent {
  info: any;
  

  constructor(private societeService: SocieteService) {}

  ngOnInit(): void {
    this.info = this.societeService.getInfo();
  }
}
