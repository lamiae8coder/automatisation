import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DessinExterieurComponent } from './dessin-exterieur.component';

describe('DessinExterieurComponent', () => {
  let component: DessinExterieurComponent;
  let fixture: ComponentFixture<DessinExterieurComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DessinExterieurComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DessinExterieurComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
