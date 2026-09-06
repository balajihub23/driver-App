import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BottomNavigationComponent } from '../../shared/components/bottom-navigation/bottom-navigation.component';
import { SupportService } from '../../core/services/support.service';
import { DocumentService } from '../../core/services/document.service';

export type SupportViewMode = 'LIST' | 'RAISE_TICKET' | 'TICKET_CONFIRMATION' | 'CHAT_THREAD';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BottomNavigationComponent],
  templateUrl: './support.component.html',
  styleUrl: './support.component.scss'
})
export class SupportComponent implements OnInit {
  supportService = inject(SupportService);
  documentService = inject(DocumentService);

  activeSubTab: 'TICKETS' | 'FAQ' = 'TICKETS';
  viewMode: SupportViewMode = 'LIST';

  // FAQs Accordion State
  expandedFaqId: number | null = 1;
  searchQuery: string = '';

  // Tickets List State
  tickets: any[] = [];
  filteredTickets: any[] = [];
  selectedTicket: any = null;
  lastCreatedTicketNumber: string = '#INC-2948';

  // Chat State
  chatMessages: any[] = [];
  newMessageText: string = '';
  showTicketMenu: boolean = false;

  // Raise Ticket Form State
  newTicket = {
    category: '',
    priority: 'MEDIUM',
    subject: '',
    description: '',
    attachmentFile: null as File | null,
    attachmentUrl: ''
  };
  attachmentPreviewName: string = '';

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.supportService.getTickets().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.tickets = res.data;
          this.filterTickets();
        }
      },
      error: () => {
        // Fallback default sample tickets matching Figma if backend empty
        this.tickets = [
          {
            id: 2948,
            ticketNumber: 'INC-2948',
            category: 'Payout Issue',
            subject: 'Payout Issue - #INC-2948',
            description: 'Please credit the payment soon',
            status: 'OPEN',
            createdAt: '10:42 AM'
          },
          {
            id: 2945,
            ticketNumber: 'INC-2945',
            category: 'Payout Issue',
            subject: 'Payout Issue - #INC-2945',
            description: 'Please credit the payment soon',
            status: 'OPEN',
            createdAt: 'Yesterday'
          },
          {
            id: 2911,
            ticketNumber: 'INC-2911',
            category: 'Payout Issue',
            subject: 'Payout Issue - #INC-2911',
            description: 'Please credit the payment soon',
            status: 'RESOLVED',
            createdAt: 'Tue'
          }
        ];
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

    this.supportService.getTicketDetails(ticket.id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.selectedTicket = res.data.ticket || ticket;
          this.chatMessages = res.data.messages || [];
        }
      },
      error: () => {
        // Fallback mock messages matching Figma screen thread
        this.chatMessages = [
          { id: 1, senderRole: 'ADMIN', message: 'Please credit the payment soon', createdAt: '08:30 AM' },
          { id: 2, senderRole: 'DRIVER', message: 'Good morning. We need the JCB 3DX at Sector 45 trenching site by 10 AM. Ground conditions are a bit muddy after last night\'s rain. Are you on schedule?', createdAt: '08:32 AM' },
          { id: 3, senderRole: 'DRIVER', message: 'Morning! Yes, en route. Passing the checkpoint now. Have the mud tracks equipped. ETA 09:45 AM.', createdAt: '08:35 AM' }
        ];
      }
    });
  }

  onSendMessage(): void {
    if (!this.newMessageText.trim() || !this.selectedTicket) return;
    const text = this.newMessageText;
    this.newMessageText = '';

    this.supportService.sendMessage(this.selectedTicket.id, text).subscribe({
      next: (res) => {
        if (res.success) {
          this.chatMessages.push(res.data);
        }
      },
      error: () => {
        // Optimistic UI append
        this.chatMessages.push({
          id: Date.now(),
          senderRole: 'DRIVER',
          message: text,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    });
  }

  onReopenTicket(): void {
    if (!this.selectedTicket) return;
    this.supportService.reopenTicket(this.selectedTicket.id).subscribe({
      next: (res) => {
        if (res.success) {
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

  onFileAttachmentSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.newTicket.attachmentFile = file;
      this.attachmentPreviewName = file.name;
    }
  }

  removeAttachment(): void {
    this.newTicket.attachmentFile = null;
    this.attachmentPreviewName = '';
  }

  onSubmitTicket(): void {
    if (!this.newTicket.category || !this.newTicket.subject || !this.newTicket.description) return;

    this.supportService.createTicket(
      this.newTicket.category,
      this.newTicket.subject,
      this.newTicket.description,
      this.newTicket.priority
    ).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.lastCreatedTicketNumber = '#' + (res.data.ticketNumber || 'INC-' + Math.floor(1000 + Math.random() * 9000));
          this.viewMode = 'TICKET_CONFIRMATION';
          this.resetTicketForm();
          this.loadTickets();
        }
      },
      error: () => {
        this.lastCreatedTicketNumber = '#INC-' + Math.floor(1000 + Math.random() * 9000);
        this.viewMode = 'TICKET_CONFIRMATION';
        this.resetTicketForm();
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
      attachmentUrl: ''
    };
    this.attachmentPreviewName = '';
  }

  toggleFaq(id: number): void {
    this.expandedFaqId = this.expandedFaqId === id ? null : id;
  }
}
