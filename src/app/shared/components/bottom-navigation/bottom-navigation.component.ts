import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-bottom-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './bottom-navigation.component.html',
  styleUrl: './bottom-navigation.component.scss'
})
export class BottomNavigationComponent {}
