import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImporterDessinComponent } from './importer-dessin.component';

describe('ImporterDessinComponent', () => {
  let component: ImporterDessinComponent;
  let fixture: ComponentFixture<ImporterDessinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ImporterDessinComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImporterDessinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
