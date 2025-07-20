import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AffaireProgressService } from '../services/affaire-progress.service';

@Injectable({
  providedIn: 'root'
})
export class Step2AccessGuard implements CanActivate {
  constructor(
    private progressService: AffaireProgressService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.progressService.isStep1Completed()) {
      return true;
    }
    this.router.navigate(['/admin/add-affaire/mise-a-jour']);
    return false;
  }
}
