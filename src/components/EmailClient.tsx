import { useState, useEffect } from 'react';
import { FolderSidebar } from './FolderSidebar';
import { EmailList } from './EmailList';
import { EmailViewer } from './EmailViewer';
import { db, EmailData, FolderInfo } from '@/lib/database';
import { Button } from '@/components/ui/button';
import { Upload, RefreshCw } from 'lucide-react';
import { enUS, nl, fr } from 'date-fns/locale';
import { Locale } from 'date-fns';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

interface EmailClientProps {
  onBackToUpload: () => void;
}

export function EmailClient({ onBackToUpload }: EmailClientProps) {
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEmail, setSelectedEmail] = useState<EmailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<string>(() => {
    const stored = localStorage.getItem('preferredTheme');
    if (stored) return stored;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'system';
  });

  const [language, setLanguage] = useState<string>(() => {
    const stored = localStorage.getItem('preferredLanguage');
    if (stored) return stored;
    const browserLang = navigator.language.slice(0,2).toLowerCase();
    return ['en','nl','fr'].includes(browserLang) ? browserLang : 'en';
  });

  const localeMap: Record<string, Locale> = {
    en: enUS,
    nl,
    fr,
  };

  const uiText = {
    en: { folders: 'Folders', conversations: 'conversations', search: 'Search mail (e.g., from:alice)', newImport: 'New Import' },
    nl: { folders: 'Mappen', conversations: 'conversaties', search: 'Zoek e-mail (bijv. van:alice)', newImport: 'Nieuwe import' },
    fr: { folders: 'Dossiers', conversations: 'conversations', search: 'Rechercher un e-mail (ex. from:alice)', newImport: 'Nouvel import' },
  } as const;

  // Apply theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-blue', 'theme-dark-blue');
    switch (theme) {
      case 'dark':
        root.classList.add('dark');
        break;
      case 'blue':
        root.classList.add('theme-blue');
        break;
      case 'dark-blue':
        root.classList.add('dark', 'theme-dark-blue');
        break;
      default:
        // system/default: nothing
        break;
    }
  }, [theme]);

  // Persist preferences
  useEffect(() => {
    localStorage.setItem('preferredTheme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('preferredLanguage', language);
  }, [language]);

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      loadEmails(selectedFolder, searchQuery);
    }
  }, [selectedFolder, searchQuery]);

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

  const filterEmailsByQuery = (list: EmailData[], query: string) => {
    if (!query.trim()) return list;

    const lower = query.toLowerCase();

    const applySearch = (email: EmailData, val: string, fields: (keyof EmailData)[]) =>
      fields.some((f) => ((email[f] as unknown as string)?.toLowerCase() ?? '').includes(val));

    if (lower.startsWith('from:')) {
      const val = lower.slice(5).trim();
      return list.filter((e) => e.From.toLowerCase().includes(val));
    } else if (lower.startsWith('to:')) {
      const val = lower.slice(3).trim();
      return list.filter((e) => e.To.toLowerCase().includes(val));
    } else if (lower.startsWith('subject:')) {
      const val = lower.slice(8).trim();
      return list.filter((e) => e.Subject.toLowerCase().includes(val));
    } else if (lower.startsWith('attachments:')) {
      const val = lower.slice(12).trim();
      return list.filter((e) => {
        if (!e.HasAttachments) return false;
        if (!val) return true;
        const attachmentNames = (e.Attachments || []).map((a) => a.FileName.toLowerCase());
        return attachmentNames.some((name) => name.includes(val));
      });
    }

    // Default: search across common fields
    return list.filter((e) =>
      applySearch(e, lower, ['From', 'To', 'Subject']) ||
      (e.TextBody?.toLowerCase().includes(lower) ?? false) ||
      (e.HtmlBody?.toLowerCase().includes(lower) ?? false)
    );
  };

  const loadEmails = async (folderId: string, query: string) => {
    try {
      let emailList = await db.emails.where('folderId').equals(folderId).toArray();
      // Sort by date descending
      emailList.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
      emailList = filterEmailsByQuery(emailList, query);
      setEmails(emailList);
      setSelectedEmail(null);
    } catch (error) {
      console.error('Failed to load emails:', error);
    }
  };

  const handleEmailSelect = async (email: EmailData) => {
    console.log('Email selected:', email.Id, email.Subject);

    // If unread, mark as read both in DB and local state
    if (!email.isRead) {
      try {
        await db.emails.update(email.Id, { isRead: true });
        setEmails((prev) =>
          prev.map((e) => (e.Id === email.Id ? { ...e, isRead: true } : e))
        );
        email = { ...email, isRead: true };
      } catch (error) {
        console.error('Failed to mark email as read:', error);
      }
    }

    setSelectedEmail(email);
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
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-normal text-[hsl(var(--gmail-sidebar-foreground))]">
            ZipMail Vault
          </h1>
          <div className="flex items-center gap-3">
            {/* Language selector */}
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-28 h-8 bg-white/50 border-[hsl(var(--gmail-border))]">
                <SelectValue placeholder="Lang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="nl">Nederlands</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>

            {/* Theme selector */}
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-32 h-8 bg-white/50 border-[hsl(var(--gmail-border))]">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="blue">Blue</SelectItem>
                <SelectItem value="dark-blue">Dark Blue</SelectItem>
              </SelectContent>
            </Select>

            <Button
            variant="outline"
            size="sm"
            onClick={clearData}
            className="bg-transparent border-[hsl(var(--gmail-border))] text-[hsl(var(--gmail-sidebar-foreground))] hover:bg-[hsl(var(--gmail-sidebar-hover))]"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uiText[language].newImport}
          </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Sidebar */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="bg-[hsl(var(--gmail-sidebar))] border-r border-[hsl(var(--gmail-border))] flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-[hsl(var(--gmail-border))]">
              <Input
                placeholder={uiText[language].search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              <FolderSidebar
                folders={folders}
                selectedFolder={selectedFolder}
                onFolderSelect={setSelectedFolder}
                label={uiText[language].folders}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />

          {/* Email List */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="bg-[hsl(var(--gmail-list))] border-r border-[hsl(var(--gmail-border))]">
            <EmailList
              emails={emails}
              selectedEmail={selectedEmail}
              onEmailSelect={handleEmailSelect}
              folderName={folders.find(f => f.id === selectedFolder)?.FolderName ||
                (folders.find(f => f.id === selectedFolder) as any)?.Name ||
                selectedFolder || 'Folder'}
              locale={localeMap[language]}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />

          {/* Email Viewer */}
          <ResizablePanel defaultSize={55} minSize={30} className="bg-[hsl(var(--gmail-list))] overflow-hidden">
            <EmailViewer 
              email={selectedEmail} 
              folderName={folders.find(f => f.id === selectedFolder)?.FolderName ||
                (folders.find(f => f.id === selectedFolder) as any)?.Name}
              locale={localeMap[language]}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}