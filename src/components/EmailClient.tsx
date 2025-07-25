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
    <div className="h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-64 bg-email-sidebar border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-semibold text-email-sidebar-foreground">Email Client</h1>
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={clearData}
              className="bg-transparent border-email-sidebar-foreground/20 text-email-sidebar-foreground hover:bg-email-sidebar-foreground/10"
            >
              <Upload className="h-3 w-3 mr-1" />
              New Import
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <FolderSidebar
            folders={folders}
            selectedFolder={selectedFolder}
            onFolderSelect={setSelectedFolder}
          />
        </div>
      </div>

      {/* Email List */}
      <div className="w-80 bg-email-list border-r border-border">
        <EmailList
          emails={emails}
          selectedEmail={selectedEmail}
          onEmailSelect={handleEmailSelect}
        />
      </div>

      {/* Email Viewer */}
      <div className="flex-1 bg-background">
        <EmailViewer email={selectedEmail} />
      </div>
    </div>
  );
}