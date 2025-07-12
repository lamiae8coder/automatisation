import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiseAJourComponent } from './mise-a-jour.component';

describe('MiseAJourComponent', () => {
  let component: MiseAJourComponent;
  let fixture: ComponentFixture<MiseAJourComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MiseAJourComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MiseAJourComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
