import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { step2AccessGuard } from './step2-access.guard';

describe('step2AccessGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => step2AccessGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
