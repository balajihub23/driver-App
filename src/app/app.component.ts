import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SplashComponent } from './components/splash/splash.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SplashComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'driverApp';
  showSplash = true;

  onSplashFinish(): void {
    console.log('Splash screen completed loading');
    // keep splash or transition to main driver app view
  }
}
