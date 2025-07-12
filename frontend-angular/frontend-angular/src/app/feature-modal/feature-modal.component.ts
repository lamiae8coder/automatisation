import { Component, Inject  } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@Component({
  selector: 'app-feature-modal',
  standalone: false,
  templateUrl: './feature-modal.component.html',
  styleUrl: './feature-modal.component.css'
})
export class FeatureModalComponent {
  objectKeys = Object.keys;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { [key: string]: any }) {}

}
