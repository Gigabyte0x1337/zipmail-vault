import JSZip from 'jszip';
import { db, EmailData, FolderInfo, ExportIndex } from './database';

export class ZipImporter {
  async importZipFile(file: File): Promise<void> {
    const zip = new JSZip();
    const zipData = await zip.loadAsync(file);
    
    // Clear existing data
    await db.emails.clear();
    await db.folders.clear();
    await db.exportIndex.clear();
    await db.attachments.clear();

    // Import export index
    const exportIndexFile = zipData.file('export-index.json');
    if (exportIndexFile) {
      const exportIndexContent = await exportIndexFile.async('text');
      const exportIndex: ExportIndex = JSON.parse(exportIndexContent);
      await db.exportIndex.add(exportIndex);
    }

    // Process folders
    const folders: { [key: string]: string } = {};
    for (const [path, zipEntry] of Object.entries(zipData.files)) {
      if (zipEntry.dir && path !== 'attachments/') {
        const folderName = path.replace('/', '');
        folders[folderName] = folderName;
      }
    }

    // Import folder info and emails
    for (const folderName of Object.keys(folders)) {
      const folderId = folderName;
      
      // Import folder info
      const folderInfoFile = zipData.file(`${folderName}/folder-info.json`);
      if (folderInfoFile) {
        const folderInfoContent = await folderInfoFile.async('text');
        const folderInfo: FolderInfo = { ...JSON.parse(folderInfoContent), id: folderId };
        await db.folders.add(folderInfo);
      }

      // Import emails
      const emailsFile = zipData.file(`${folderName}/emails.json`);
      if (emailsFile) {
        const emailsContent = await emailsFile.async('text');
        const emails: Omit<EmailData, 'folderId'>[] = JSON.parse(emailsContent);
        
        const emailsWithFolderId = emails.map(email => ({
          ...email,
          folderId,
          isRead: false
        }));
        
        await db.emails.bulkAdd(emailsWithFolderId);
      }
    }

    // Import attachments
    const attachmentPromises: Promise<void>[] = [];
    zipData.folder('attachments')?.forEach((relativePath, file) => {
      if (!file.dir) {
        const guid = relativePath;
        attachmentPromises.push(
          file.async('arraybuffer').then(async (data) => {
            await db.attachments.add({ guid, data });
          })
        );
      }
    });

    await Promise.all(attachmentPromises);
  }
}