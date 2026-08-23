import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.scss']
})
export class SplashComponent implements OnInit {
  @Output() finish = new EventEmitter<void>();

  progress = 0;
  loadingText = 'Loading your next journey...';

  ngOnInit(): void {
    this.startProgress();
  }

  startProgress(): void {
    const interval = setInterval(() => {
      if (this.progress < 100) {
        this.progress += 2;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          this.finish.emit();
        }, 500);
      }
    }, 40);
  }
}
