import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Paperclip, Download, FileText } from 'lucide-react';
import { EmailData, db } from '@/lib/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>Select an email to view its contents</p>
        </div>
      </div>
    );
  }

  const fromInfo = formatEmail(email.From);
  const toInfo = formatEmail(email.To);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Email Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{email.Subject}</CardTitle>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground min-w-[60px]">From:</span>
                <div>
                  <span className="font-medium">{fromInfo.name}</span>
                  {fromInfo.name !== fromInfo.email && (
                    <span className="text-muted-foreground ml-1">&lt;{fromInfo.email}&gt;</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground min-w-[60px]">To:</span>
                <div>
                  <span className="font-medium">{toInfo.name}</span>
                  {toInfo.name !== toInfo.email && (
                    <span className="text-muted-foreground ml-1">&lt;{toInfo.email}&gt;</span>
                  )}
                </div>
              </div>

              {email.Cc && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground min-w-[60px]">Cc:</span>
                  <span>{email.Cc}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground min-w-[60px]">Date:</span>
                <span>{format(new Date(email.Date), 'PPpp')}</span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Attachments */}
        {email.Attachments && email.Attachments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments ({email.Attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {email.Attachments.map((attachment) => (
                  <div
                    key={attachment.Guid}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">
                          {attachment.FileName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.Size)} • {attachment.MimeType}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadAttachment(attachment)}
                      disabled={!attachmentData[attachment.Guid]}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email Body */}
        <Card>
          <CardContent className="p-6">
            {email.HtmlBody ? (
              <div 
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: email.HtmlBody }}
              />
            ) : (
              <div className="whitespace-pre-wrap text-foreground">
                {email.TextBody}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}