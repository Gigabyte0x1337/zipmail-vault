import { Folder, Mail } from 'lucide-react';
import { FolderInfo } from '@/lib/database';
import { cn } from '@/lib/utils';

interface FolderSidebarProps {
  folders: FolderInfo[];
  selectedFolder: string | null;
  onFolderSelect: (folderId: string) => void;
}

export function FolderSidebar({ folders, selectedFolder, onFolderSelect }: FolderSidebarProps) {
  return (
    <div className="p-2">
      {folders.map((folder) => (
        <button
          key={folder.id}
          onClick={() => onFolderSelect(folder.id)}
          className={cn(
            "w-full text-left p-3 rounded-lg mb-1 transition-colors",
            "hover:bg-email-sidebar-foreground/10",
            selectedFolder === folder.id
              ? "bg-email-sidebar-accent text-primary-foreground"
              : "text-email-sidebar-foreground"
          )}
        >
          <div className="flex items-center gap-3">
            <Folder className="h-4 w-4 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate">
                {folder.FolderName}
              </div>
              <div className="flex items-center gap-1 text-xs opacity-70">
                <Mail className="h-3 w-3" />
                {folder.EmailCount}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}