import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreationPieceMecComponent } from './creation-piece-mec.component';

describe('CreationPieceMecComponent', () => {
  let component: CreationPieceMecComponent;
  let fixture: ComponentFixture<CreationPieceMecComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreationPieceMecComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreationPieceMecComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
