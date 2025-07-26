import { formatDistanceToNow } from 'date-fns';
import { Paperclip, Mail } from 'lucide-react';
import { EmailData } from '@/lib/database';
import { cn } from '@/lib/utils';
import { Locale } from 'date-fns';

interface EmailListProps {
  emails: EmailData[];
  selectedEmail: EmailData | null;
  onEmailSelect: (email: EmailData) => void;
  folderName?: string;
  locale?: Locale;
  conversationsLabel?: string;
}

export function EmailList({ emails, selectedEmail, onEmailSelect, folderName, locale, conversationsLabel = 'conversations' }: EmailListProps) {
  const formatSender = (from: string) => {
    const match = from.match(/"([^"]+)"/);
    if (match) return match[1];
    const emailMatch = from.match(/<([^>]+)>/);
    if (emailMatch) return emailMatch[1];
    return from;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true, locale });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-[hsl(var(--gmail-border))]">
        <div className="text-sm text-[hsl(var(--muted-foreground))] mb-1">
          {folderName || 'Folder'}
        </div>
        <h2 className="font-normal text-[hsl(var(--gmail-list-foreground))]">
          {emails.length} {conversationsLabel}
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {emails.map((email) => (
          <button
            key={email.Id}
            onClick={() => {
              console.log('Clicking email:', email.Id, email.Subject);
              onEmailSelect(email);
            }}
            className={cn(
              "w-full text-left p-4 border-b border-[hsl(var(--gmail-border))]/30 transition-colors",
              "hover:bg-[hsl(var(--gmail-item-hover))]",
              selectedEmail?.Id === email.Id
                ? "bg-[hsl(var(--gmail-item-selected))]"
                : "bg-transparent"
            )}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  {!email.isRead && (
                    <div className="w-2 h-2 bg-[hsl(var(--primary))] rounded-full flex-shrink-0" />
                  )}
                  <div className={cn(
                    "font-normal text-sm truncate",
                    email.isRead ? "text-[hsl(var(--gmail-read))]" : "text-[hsl(var(--gmail-unread))] font-medium"
                  )}>
                    {formatSender(email.From)}
                  </div>
                  {email.HasAttachments && (
                    <Paperclip className="h-4 w-4 text-[hsl(var(--muted-foreground))] flex-shrink-0" />
                  )}
                </div>
                <div className="text-xs text-[hsl(var(--muted-foreground))] flex-shrink-0">
                  {formatDate(email.Date)}
                </div>
              </div>
              
              <div className={cn(
                "text-sm truncate",
                email.isRead ? "text-[hsl(var(--gmail-read))]" : "text-[hsl(var(--gmail-unread))] font-medium"
              )}>
                {email.Subject || "(no subject)"}
              </div>
              
              <div className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-1">
                {email.TextBody?.substring(0, 100) || email.HtmlBody?.replace(/<[^>]*>/g, '').substring(0, 100) || ""}
              </div>
            </div>
          </button>
        ))}
        
        {emails.length === 0 && (
          <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No emails in this folder</p>
          </div>
        )}
      </div>
    </div>
  );
}