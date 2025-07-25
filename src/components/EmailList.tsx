import { formatDistanceToNow } from 'date-fns';
import { Paperclip } from 'lucide-react';
import { EmailData } from '@/lib/database';
import { cn } from '@/lib/utils';

interface EmailListProps {
  emails: EmailData[];
  selectedEmail: EmailData | null;
  onEmailSelect: (email: EmailData) => void;
}

export function EmailList({ emails, selectedEmail, onEmailSelect }: EmailListProps) {
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
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-email-list-foreground">
          Emails ({emails.length})
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {emails.map((email) => (
          <button
            key={email.Id}
            onClick={() => onEmailSelect(email)}
            className={cn(
              "w-full text-left p-4 border-b border-border/50 transition-colors",
              "hover:bg-email-item-hover",
              selectedEmail?.Id === email.Id
                ? "bg-email-item-selected"
                : "bg-transparent"
            )}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className={cn(
                    "font-medium text-sm truncate",
                    email.isRead ? "text-email-read" : "text-email-unread"
                  )}>
                    {formatSender(email.From)}
                  </div>
                  <div className={cn(
                    "text-sm truncate mt-1",
                    email.isRead ? "text-email-read" : "text-email-unread font-medium"
                  )}>
                    {email.Subject}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {email.HasAttachments && (
                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                  )}
                  {!email.isRead && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                {formatDate(email.Date)}
              </div>
              
              <div className="text-xs text-muted-foreground line-clamp-2">
                {email.TextBody?.substring(0, 120)}...
              </div>
            </div>
          </button>
        ))}
        
        {emails.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No emails in this folder
          </div>
        )}
      </div>
    </div>
  );
}