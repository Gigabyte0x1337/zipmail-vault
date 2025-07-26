import Dexie, { Table } from 'dexie';

export interface EmailData {
  Id: string;
  Subject: string;
  From: string;
  To: string;
  Cc: string;
  Bcc: string;
  Date: string;
  TextBody: string;
  HtmlBody: string;
  Attachments: Attachment[];
  HasAttachments: boolean;
  FileName: string;
  folderId: string;
  isRead?: boolean;
}

export interface Attachment {
  Guid: string;
  FileName: string;
  MimeType: string;
  Size: number;
  data?: ArrayBuffer;
}

export interface FolderInfo {
  id: string;
  FolderName: string;
  ExportDate: string;
  EmailCount: number;
  AttachmentCount: number;
  DateRange: {
    Earliest: string;
    Latest: string;
  };
  TopSenders: Array<{
    Sender: string;
    Count: number;
  }>;
}

export interface ExportIndex {
  ExportDate: string;
  TotalFolders: number;
  TotalEmails: number;
  TotalAttachments: number;
  Folders: Array<{
    Name: string;
    SafeName: string;
    EmailCount: number;
    AttachmentCount: number;
    DateRange: {
      Earliest: string;
      Latest: string;
    };
  }>;
}

export class EmailDatabase extends Dexie {
  emails!: Table<EmailData>;
  folders!: Table<FolderInfo>;
  exportIndex!: Table<ExportIndex>;
  attachments!: Table<{ guid: string; data: ArrayBuffer }>;

  constructor() {
    super('EmailDatabase');
    this.version(1).stores({
      emails: 'Id, folderId, Date, From, Subject, isRead',
      folders: 'id, FolderName',
      exportIndex: 'ExportDate',
      attachments: 'guid'
    });
  }
}

export const db = new EmailDatabase();