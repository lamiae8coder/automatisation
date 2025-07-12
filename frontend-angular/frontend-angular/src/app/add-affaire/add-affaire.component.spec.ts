import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddAffaireComponent } from './add-affaire.component';

describe('AddAffaireComponent', () => {
  let component: AddAffaireComponent;
  let fixture: ComponentFixture<AddAffaireComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddAffaireComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddAffaireComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
