import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeatureModalComponent } from './feature-modal.component';

describe('FeatureModalComponent', () => {
  let component: FeatureModalComponent;
  let fixture: ComponentFixture<FeatureModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FeatureModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeatureModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
