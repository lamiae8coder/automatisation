import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, GuardResult, MaybeAsync, Router, RouterStateSnapshot } from '@angular/router';
import { AuthenticationService } from '../services/authentication.service';
@Injectable()
export class AuthGuard {
  constructor(private authService : AuthenticationService, private router : Router){

  }
  canActivate(route:ActivatedRouteSnapshot, state:RouterStateSnapshot): MaybeAsync<GuardResult>{
    if(this.authService.authenticated==true){
      return true;
    }else
      this.router.navigateByUrl("/login");
      return false;
  }
}

// export const authGuard: CanActivateFn = (route, state) => {
//   return true;
// };
