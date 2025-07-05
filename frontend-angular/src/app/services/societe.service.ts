import { Injectable } from '@angular/core';
import { SOCIETE_INFO } from '../config/societe.config';

@Injectable({
  providedIn: 'root'
})
export class SocieteService {
  getInfo() {
    return SOCIETE_INFO;
  }
}
