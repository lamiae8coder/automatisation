import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NatureDialogComponent } from './nature-dialog.component';

describe('NatureDialogComponent', () => {
  let component: NatureDialogComponent;
  let fixture: ComponentFixture<NatureDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NatureDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NatureDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
