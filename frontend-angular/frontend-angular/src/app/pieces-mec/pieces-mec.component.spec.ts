import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PiecesMecComponent } from './pieces-mec.component';

describe('PiecesMecComponent', () => {
  let component: PiecesMecComponent;
  let fixture: ComponentFixture<PiecesMecComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PiecesMecComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PiecesMecComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
