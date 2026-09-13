import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ThemeService } from './core/services/theme.service';
import { WebSocketService } from './core/services/websocket.service';
import { NotificationService } from './core/services/notification.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Rentron Driver App';
  themeService = inject(ThemeService);
  wsService = inject(WebSocketService);
  notificationService = inject(NotificationService);
  authService = inject(AuthService);
  router = inject(Router);

  private supportSub?: Subscription;

  ngOnInit(): void {
    const user = this.authService.currentUser ? this.authService.currentUser() : null;
    const userId = user?.id || 1;
    this.wsService.connectWebSocket(userId);

    // Listen to real-time support messages via STOMP WebSocket
    this.supportSub = this.wsService.supportMessage$.subscribe((evt) => {
      if (evt && evt.type === 'SUPPORT_CHAT_MESSAGE') {
        const msgText = evt.message?.message || evt.message || 'New message from Support';
        const currentUrl = this.router.url;

        // If not already viewing this ticket's chat thread, display floating notification banner
        if (!currentUrl.includes('/support')) {
          this.notificationService.showSupportBanner(
            evt.ticketId,
            evt.ticketNumber || ('INC-' + evt.ticketId),
            msgText,
            evt.subject
          );
        }
      }
    });
  }

  onBannerClick(ticketId: number): void {
    this.notificationService.dismissSupportBanner();
    this.router.navigate(['/support'], { queryParams: { ticketId } });
  }

  dismissBanner(): void {
    this.notificationService.dismissSupportBanner();
  }

  ngOnDestroy(): void {
    this.supportSub?.unsubscribe();
  }
}
