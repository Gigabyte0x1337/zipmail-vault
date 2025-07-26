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
    <div className="p-4">
      <h2 className="text-sm font-medium text-[hsl(var(--gmail-sidebar-foreground))] mb-3 px-2">
        Folders
      </h2>
      {folders.map((folder) => (
        <button
          key={folder.id}
          onClick={() => onFolderSelect(folder.id)}
          className={cn(
            "w-full text-left p-2 rounded-lg mb-1 transition-colors group",
            "hover:bg-[hsl(var(--gmail-sidebar-hover))]",
            selectedFolder === folder.id
              ? "bg-[hsl(var(--gmail-sidebar-selected))] text-[hsl(var(--primary))]"
              : "text-[hsl(var(--gmail-sidebar-foreground))]"
          )}
        >
          <div className="flex items-center gap-3">
            <Folder className="h-4 w-4 flex-shrink-0" />
            <div className="min-w-0 flex-1 flex items-center justify-between">
              <div className="font-normal text-sm truncate">
                {folder.FolderName}
              </div>
              {folder.EmailCount > 0 && (
                <span className="text-xs opacity-70 ml-2">
                  {folder.EmailCount}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}