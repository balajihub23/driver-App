import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { BottomNavigationComponent } from '../../shared/components/bottom-navigation/bottom-navigation.component';
import { SupportService } from '../../core/services/support.service';
import { DocumentService } from '../../core/services/document.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { NotificationService } from '../../core/services/notification.service';

export type SupportViewMode = 'LIST' | 'RAISE_TICKET' | 'TICKET_CONFIRMATION' | 'CHAT_THREAD';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BottomNavigationComponent],
  templateUrl: './support.component.html',
  styleUrl: './support.component.scss'
})
export class SupportComponent implements OnInit, OnDestroy {
  supportService = inject(SupportService);
  documentService = inject(DocumentService);
  wsService = inject(WebSocketService);
  notificationService = inject(NotificationService);
  route = inject(ActivatedRoute);

  activeSubTab: 'TICKETS' | 'FAQ' = 'TICKETS';
  viewMode: SupportViewMode = 'LIST';

  @ViewChild('chatMessagesContainer') chatMessagesContainer?: ElementRef;

  // FAQs Accordion State
  expandedFaqId: number | null = 1;
  searchQuery: string = '';

  // Tickets List State
  tickets: any[] = [];
  filteredTickets: any[] = [];
  selectedTicket: any = null;
  lastCreatedTicketNumber: string = '';

  // Chat State
  chatMessages: any[] = [];
  newMessageText: string = '';
  showTicketMenu: boolean = false;
  chatAttachmentFile: File | null = null;
  chatAttachmentPreviewName: string = '';
  chatAttachmentPreviewUrl: string = '';

  // Custom Dropdown Picker States
  isCategoryDropdownOpen: boolean = false;
  isPriorityDropdownOpen: boolean = false;
  categoryOptions = [
    'Payout Issue',
    'Job Assignment',
    'App Technical Issue',
    'Vehicle / Equipment',
    'Other Query'
  ];
  priorityOptions = [
    { label: 'High', value: 'HIGH' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'Low', value: 'LOW' }
  ];

  // Raise Ticket Form State
  newTicket = {
    category: '',
    priority: 'MEDIUM',
    subject: '',
    description: '',
    attachmentFile: null as File | null,
    attachmentUrl: '',
    attachmentName: ''
  };
  attachmentPreviewName: string = '';
  isSubmitting: boolean = false;

  private routeSub?: Subscription;
  private wsSub?: Subscription;

  ngOnInit(): void {
    this.loadTickets();

    // Check query params if navigated from a Notification Banner click
    this.routeSub = this.route.queryParams.subscribe(params => {
      if (params['ticketId']) {
        const ticketId = Number(params['ticketId']);
        this.openTargetTicket(ticketId);
      }
    });

    // Subscribe to STOMP WebSocket real-time support chat events
    this.wsSub = this.wsService.supportMessage$.subscribe((evt) => {
      if (!evt) return;

      if (evt.type === 'SUPPORT_CHAT_MESSAGE') {
        const targetId = Number(evt.ticketId);

        if (this.viewMode === 'CHAT_THREAD' && this.selectedTicket && (Number(this.selectedTicket.id) === targetId || this.selectedTicket.ticketNumber === evt.ticketNumber)) {
          this.notificationService.dismissSupportBanner();

          const incomingMsg = evt.message;
          const msgObj = typeof incomingMsg === 'object' ? incomingMsg : {
            id: Date.now(),
            senderRole: 'ADMIN',
            message: incomingMsg || 'New admin message',
            createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          const exists = this.chatMessages.some(m => m.id === msgObj.id || (m.message === msgObj.message && m.createdAt === msgObj.createdAt));
          if (!exists) {
            this.chatMessages.push(msgObj);
            this.scrollToBottom();
          }
        } else {
          this.loadTickets();
          const previewText = typeof evt.message === 'object' ? evt.message.message : evt.message;
          this.notificationService.showSupportBanner(targetId, evt.ticketNumber || ('INC-' + targetId), previewText || 'New message from support', evt.subject);
        }
      } else if (evt.type === 'SUPPORT_TICKET_STATUS') {
        if (this.selectedTicket && (Number(this.selectedTicket.id) === Number(evt.ticketId))) {
          this.selectedTicket.status = evt.status;
        }
        this.loadTickets();
      }
    });
  }

  private openTargetTicket(ticketId: number): void {
    const found = this.tickets.find(t => Number(t.id) === ticketId);
    if (found) {
      this.openTicketDetails(found);
    } else {
      this.supportService.getTicketDetails(ticketId).subscribe({
        next: (res) => {
          if (res && res.success && res.data && res.data.ticket) {
            this.openTicketDetails(res.data.ticket);
          }
        }
      });
    }
  }

  loadTickets(): void {
    this.supportService.getTickets().subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.tickets = res.data;
        } else {
          this.tickets = [];
        }
        this.filterTickets();
      },
      error: () => {
        this.tickets = [];
        this.filterTickets();
      }
    });
  }

  filterTickets(): void {
    if (!this.searchQuery.trim()) {
      this.filteredTickets = [...this.tickets];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredTickets = this.tickets.filter(t => 
        (t.ticketNumber || '').toLowerCase().includes(q) ||
        (t.subject || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q)
      );
    }
  }

  openTicketDetails(ticket: any): void {
    this.selectedTicket = ticket;
    this.viewMode = 'CHAT_THREAD';
    this.showTicketMenu = false;
    this.notificationService.dismissSupportBanner();

    this.supportService.getTicketDetails(ticket.id).subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.selectedTicket = res.data.ticket || ticket;
          const msgs = res.data.messages || [];
          if (msgs.length > 0) {
            this.chatMessages = msgs;
          } else if (this.selectedTicket && this.selectedTicket.description) {
            this.chatMessages = [{
              id: 'desc-' + this.selectedTicket.id,
              senderRole: 'DRIVER',
              message: this.selectedTicket.description,
              attachmentUrl: this.selectedTicket.attachmentUrl,
              attachmentName: this.selectedTicket.attachmentName,
              createdAt: this.selectedTicket.createdAt
            }];
          } else {
            this.chatMessages = [];
          }
        } else {
          this.chatMessages = [];
        }
        this.scrollToBottom();
      },
      error: () => {
        this.chatMessages = [];
        this.scrollToBottom();
      }
    });
  }

  // Custom Dropdown Handlers
  toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
    this.isPriorityDropdownOpen = false;
  }

  selectCategory(val: string): void {
    this.newTicket.category = val;
    this.isCategoryDropdownOpen = false;
  }

  togglePriorityDropdown(): void {
    this.isPriorityDropdownOpen = !this.isPriorityDropdownOpen;
    this.isCategoryDropdownOpen = false;
  }

  selectPriority(val: string): void {
    this.newTicket.priority = val;
    this.isPriorityDropdownOpen = false;
  }

  getPriorityLabel(val: string): string {
    const found = this.priorityOptions.find(p => p.value === val);
    return found ? found.label : 'Medium';
  }

  // File Upload Handlers for Ticket Form
  onFileAttachmentSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.newTicket.attachmentFile = file;
      this.attachmentPreviewName = file.name;
    }
  }

  removeAttachment(): void {
    this.newTicket.attachmentFile = null;
    this.newTicket.attachmentUrl = '';
    this.newTicket.attachmentName = '';
    this.attachmentPreviewName = '';
  }

  // File Upload Handlers for Chat Bar
  onChatFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.chatAttachmentFile = file;
      this.chatAttachmentPreviewName = file.name;
      this.chatAttachmentPreviewUrl = URL.createObjectURL(file);
    }
  }

  removeChatAttachment(): void {
    this.chatAttachmentFile = null;
    this.chatAttachmentPreviewName = '';
    this.chatAttachmentPreviewUrl = '';
  }

  onSubmitTicket(): void {
    if (!this.newTicket.category || !this.newTicket.subject || !this.newTicket.description || this.isSubmitting) return;

    this.isSubmitting = true;

    if (this.newTicket.attachmentFile) {
      this.documentService.uploadDocument(this.newTicket.attachmentFile, 'SUPPORT_ATTACHMENT', 'SUPPORT_TICKET', 1).subscribe({
        next: (res) => {
          let attachmentUrl = '';
          let attachmentName = this.newTicket.attachmentFile?.name || '';
          if (res && res.success && res.data) {
            attachmentUrl = this.documentService.downloadUrl(res.data.id);
            attachmentName = res.data.fileName || attachmentName;
          }
          this.executeCreateTicket(attachmentUrl, attachmentName);
        },
        error: () => {
          this.executeCreateTicket('', this.newTicket.attachmentFile?.name || '');
        }
      });
    } else {
      this.executeCreateTicket();
    }
  }

  private executeCreateTicket(attachmentUrl: string = '', attachmentName: string = ''): void {
    this.supportService.createTicket(
      this.newTicket.category,
      this.newTicket.subject,
      this.newTicket.description,
      this.newTicket.priority,
      attachmentUrl,
      attachmentName
    ).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res && res.success && res.data) {
          this.lastCreatedTicketNumber = '#' + (res.data.ticketNumber || 'INC-' + res.data.id);
        } else {
          this.lastCreatedTicketNumber = '';
        }
        this.viewMode = 'TICKET_CONFIRMATION';
        this.resetTicketForm();
        this.loadTickets();
      },
      error: () => {
        this.isSubmitting = false;
        this.viewMode = 'TICKET_CONFIRMATION';
        this.resetTicketForm();
      }
    });
  }

  onSendMessage(): void {
    if ((!this.newMessageText.trim() && !this.chatAttachmentFile) || !this.selectedTicket) return;
    
    const text = this.newMessageText.trim();
    const file = this.chatAttachmentFile;
    const previewUrl = this.chatAttachmentPreviewUrl;
    const fileName = this.chatAttachmentPreviewName;

    this.newMessageText = '';
    this.removeChatAttachment();

    if (file) {
      this.documentService.uploadDocument(file, 'SUPPORT_CHAT_ATTACHMENT', 'SUPPORT_MESSAGE', this.selectedTicket.id).subscribe({
        next: (res) => {
          let attachmentUrl = previewUrl;
          let attachmentName = fileName;
          if (res && res.success && res.data) {
            attachmentUrl = this.documentService.downloadUrl(res.data.id);
            attachmentName = res.data.fileName || fileName;
          }
          this.executeSendMessage(text, attachmentUrl, attachmentName);
        },
        error: () => {
          this.executeSendMessage(text, previewUrl, fileName);
        }
      });
    } else {
      this.executeSendMessage(text);
    }
  }

  private executeSendMessage(messageText: string, attachmentUrl?: string, attachmentName?: string): void {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    this.supportService.sendMessage(this.selectedTicket.id, messageText, attachmentUrl, attachmentName).subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          const exists = this.chatMessages.some(m => m.id === res.data.id);
          if (!exists) {
            this.chatMessages.push({
              ...res.data,
              isDelivered: true
            });
            this.scrollToBottom();
          }
        }
      },
      error: () => {}
    });
  }

  scrollToBottom(): void {
    setTimeout(() => {
      try {
        if (this.chatMessagesContainer?.nativeElement) {
          const el = this.chatMessagesContainer.nativeElement;
          el.scrollTop = el.scrollHeight + 1000;
        }
        window.scrollTo({
          top: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, 99999),
          behavior: 'smooth'
        });
      } catch (err) {}
    }, 120);
  }

  onReopenTicket(): void {
    if (!this.selectedTicket) return;
    this.supportService.reopenTicket(this.selectedTicket.id).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.selectedTicket = res.data;
          this.selectedTicket.status = 'REOPENED';
          this.showTicketMenu = false;
        }
      },
      error: () => {
        this.selectedTicket.status = 'REOPENED';
        this.showTicketMenu = false;
      }
    });
  }

  resetTicketForm(): void {
    this.newTicket = {
      category: '',
      priority: 'MEDIUM',
      subject: '',
      description: '',
      attachmentFile: null,
      attachmentUrl: '',
      attachmentName: ''
    };
    this.attachmentPreviewName = '';
    this.isCategoryDropdownOpen = false;
    this.isPriorityDropdownOpen = false;
  }

  toggleFaq(id: number): void {
    this.expandedFaqId = this.expandedFaqId === id ? null : id;
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.wsSub?.unsubscribe();
  }
}
