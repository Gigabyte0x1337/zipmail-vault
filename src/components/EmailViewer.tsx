import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Paperclip, Download, FileText, Mail } from 'lucide-react';
import { EmailData, db } from '@/lib/database';
import { Button } from '@/components/ui/button';

interface EmailViewerProps {
  email: EmailData | null;
}

export function EmailViewer({ email }: EmailViewerProps) {
  const [attachmentData, setAttachmentData] = useState<{ [guid: string]: ArrayBuffer }>({});

  useEffect(() => {
    if (email?.Attachments?.length) {
      loadAttachments();
    }
  }, [email]);

  const loadAttachments = async () => {
    if (!email?.Attachments) return;
    
    const data: { [guid: string]: ArrayBuffer } = {};
    for (const attachment of email.Attachments) {
      try {
        const attachmentRecord = await db.attachments.get(attachment.Guid);
        if (attachmentRecord) {
          data[attachment.Guid] = attachmentRecord.data;
        }
      } catch (error) {
        console.error(`Failed to load attachment ${attachment.Guid}:`, error);
      }
    }
    setAttachmentData(data);
  };

  const downloadAttachment = (attachment: any) => {
    const data = attachmentData[attachment.Guid];
    if (!data) return;

    const blob = new Blob([data], { type: attachment.MimeType || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.FileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatEmail = (emailStr: string) => {
    const match = emailStr.match(/"([^"]+)"\s*<([^>]+)>/);
    if (match) {
      return { name: match[1], email: match[2] };
    }
    const emailMatch = emailStr.match(/<([^>]+)>/);
    if (emailMatch) {
      return { name: emailMatch[1], email: emailMatch[1] };
    }
    return { name: emailStr, email: emailStr };
  };

  if (!email) {
    return (
      <div className="h-full flex items-center justify-center bg-[hsl(var(--gmail-list))]">
        <div className="text-center text-[hsl(var(--muted-foreground))]">
          <Mail className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-light">Select a conversation to read</p>
          <p className="text-sm mt-2 opacity-70">Choose an email from the list to view it here</p>
        </div>
      </div>
    );
  }

  const fromInfo = formatEmail(email.From);
  const toInfo = formatEmail(email.To);

  return (
    <div className="h-full overflow-y-auto bg-[hsl(var(--gmail-list))]">
      <div className="p-6 space-y-4">
        {/* Gmail-style email header */}
        <div className="border-b border-[hsl(var(--gmail-border))] pb-4">
          <h1 className="text-xl font-normal text-[hsl(var(--gmail-unread))] mb-3">
            {email.Subject || "(no subject)"}
          </h1>
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 bg-[hsl(var(--primary))] text-white rounded-full flex items-center justify-center text-sm font-medium">
                {fromInfo.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-[hsl(var(--gmail-unread))]">
                    {fromInfo.name}
                  </span>
                  {fromInfo.name !== fromInfo.email && (
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">
                      &lt;{fromInfo.email}&gt;
                    </span>
                  )}
                </div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">
                  to {toInfo.name}
                  {email.Cc && (
                    <span>, {email.Cc}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-sm text-[hsl(var(--muted-foreground))] text-right">
              {format(new Date(email.Date), 'MMM d, yyyy, h:mm a')}
              {email.HasAttachments && (
                <div className="flex items-center gap-1 mt-1 justify-end">
                  <Paperclip className="h-3 w-3" />
                  <span className="text-xs">{email.Attachments?.length || 0} attachments</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Attachments */}
        {email.Attachments && email.Attachments.length > 0 && (
          <div className="bg-[hsl(var(--muted))] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Paperclip className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <span className="text-sm font-medium text-[hsl(var(--gmail-unread))]">
                {email.Attachments.length} attachment{email.Attachments.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-2">
              {email.Attachments.map((attachment) => (
                <div
                  key={attachment.Guid}
                  className="flex items-center justify-between p-2 bg-background rounded border border-[hsl(var(--gmail-border))]"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className="h-4 w-4 text-[hsl(var(--muted-foreground))] flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate text-[hsl(var(--gmail-unread))]">
                        {attachment.FileName}
                      </div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">
                        {formatFileSize(attachment.Size)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadAttachment(attachment)}
                    disabled={!attachmentData[attachment.Guid]}
                    className="flex-shrink-0"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Email Body */}
        <div className="prose prose-sm max-w-none dark:prose-invert prose-gray">
          {email.HtmlBody ? (
            <div 
              className="text-[hsl(var(--gmail-unread))]"
              dangerouslySetInnerHTML={{ __html: email.HtmlBody }}
            />
          ) : email.TextBody ? (
            <div className="whitespace-pre-wrap text-[hsl(var(--gmail-unread))] leading-relaxed">
              {email.TextBody}
            </div>
          ) : (
            <div className="text-[hsl(var(--muted-foreground))] italic py-8 text-center">
              This email has no content to display.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}