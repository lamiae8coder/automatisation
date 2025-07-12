import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SocieteInfoComponent } from './societe-info.component';

describe('SocieteInfoComponent', () => {
  let component: SocieteInfoComponent;
  let fixture: ComponentFixture<SocieteInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SocieteInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SocieteInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
