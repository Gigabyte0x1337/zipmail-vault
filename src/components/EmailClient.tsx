import { useState, useEffect } from 'react';
import { FolderSidebar } from './FolderSidebar';
import { EmailList } from './EmailList';
import { EmailViewer } from './EmailViewer';
import { db, EmailData, FolderInfo } from '@/lib/database';
import { Button } from '@/components/ui/button';
import { Upload, RefreshCw } from 'lucide-react';

interface EmailClientProps {
  onBackToUpload: () => void;
}

export function EmailClient({ onBackToUpload }: EmailClientProps) {
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      loadEmails(selectedFolder);
    }
  }, [selectedFolder]);

  const loadFolders = async () => {
    try {
      const folderList = await db.folders.toArray();
      setFolders(folderList);
      if (folderList.length > 0 && !selectedFolder) {
        setSelectedFolder(folderList[0].id);
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmails = async (folderId: string) => {
    try {
      const emailList = await db.emails.where('folderId').equals(folderId).toArray();
      // Sort by date descending
      emailList.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
      setEmails(emailList);
      setSelectedEmail(null);
    } catch (error) {
      console.error('Failed to load emails:', error);
    }
  };

  const handleEmailSelect = async (email: EmailData) => {
    setSelectedEmail(email);
    
    // Mark as read
    if (!email.isRead) {
      await db.emails.update(email.Id, { isRead: true });
      loadEmails(selectedFolder!);
    }
  };

  const clearData = async () => {
    await db.emails.clear();
    await db.folders.clear();
    await db.exportIndex.clear();
    await db.attachments.clear();
    onBackToUpload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading email data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Gmail-style header */}
      <div className="bg-[hsl(var(--gmail-header))] border-b border-[hsl(var(--gmail-border))] p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-normal text-[hsl(var(--gmail-sidebar-foreground))]">
            Email Client
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={clearData}
            className="bg-transparent border-[hsl(var(--gmail-border))] text-[hsl(var(--gmail-sidebar-foreground))] hover:bg-[hsl(var(--gmail-sidebar-hover))]"
          >
            <Upload className="h-4 w-4 mr-2" />
            New Import
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-[hsl(var(--gmail-sidebar))] border-r border-[hsl(var(--gmail-border))] flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <FolderSidebar
              folders={folders}
              selectedFolder={selectedFolder}
              onFolderSelect={setSelectedFolder}
            />
          </div>
        </div>

        {/* Email List */}
        <div className="w-80 bg-[hsl(var(--gmail-list))] border-r border-[hsl(var(--gmail-border))]">
          <EmailList
            emails={emails}
            selectedEmail={selectedEmail}
            onEmailSelect={handleEmailSelect}
          />
        </div>

        {/* Email Viewer */}
        <div className="flex-1 bg-[hsl(var(--gmail-list))] overflow-hidden">
          <EmailViewer email={selectedEmail} />
        </div>
      </div>
    </div>
  );
}