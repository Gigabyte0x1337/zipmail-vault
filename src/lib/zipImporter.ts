import JSZip from 'jszip';
import { db, EmailData, FolderInfo, ExportIndex } from './database';

export class ZipImporter {
  async importZipFile(file: File): Promise<void> {
    console.log('Starting ZIP import for file:', file.name, 'Size:', file.size);
    
    const zip = new JSZip();
    const zipData = await zip.loadAsync(file);
    console.log('ZIP loaded successfully, files found:', Object.keys(zipData.files).length);
    console.log('ZIP structure:', Object.keys(zipData.files));
    
    // Clear existing data
    console.log('Clearing existing data...');
    await db.emails.clear();
    await db.folders.clear();
    await db.exportIndex.clear();
    await db.attachments.clear();
    console.log('Existing data cleared');

    // Import export index
    console.log('Looking for export-index.json...');
    const exportIndexFile = zipData.file('export-index.json');
    if (exportIndexFile) {
      console.log('Found export-index.json, importing...');
      const exportIndexContent = await exportIndexFile.async('text');
      const exportIndex: ExportIndex = JSON.parse(exportIndexContent);
      await db.exportIndex.add(exportIndex);
      console.log('Export index imported:', exportIndex);
    } else {
      console.log('No export-index.json found');
    }

    // Process folders
    console.log('Processing folders...');
    const folders: { [key: string]: string } = {};
    for (const [path, zipEntry] of Object.entries(zipData.files)) {
      if (zipEntry.dir && path !== 'attachments/') {
        const folderName = path.replace('/', '');
        folders[folderName] = folderName;
        console.log('Found folder:', folderName);
      }
    }
    console.log('Total folders found:', Object.keys(folders).length, folders);

    // Import folder info and emails
    console.log('Importing folder info and emails...');
    for (const folderName of Object.keys(folders)) {
      const folderId = folderName;
      console.log(`Processing folder: ${folderName}`);
      
      // Import folder info
      const folderInfoFile = zipData.file(`${folderName}/folder-info.json`);
      if (folderInfoFile) {
        console.log(`Found folder-info.json for ${folderName}`);
        const folderInfoContent = await folderInfoFile.async('text');
        const folderInfo: FolderInfo = { ...JSON.parse(folderInfoContent), id: folderId };
        await db.folders.add(folderInfo);
        console.log(`Folder info imported for ${folderName}:`, folderInfo);
      } else {
        console.log(`No folder-info.json found for ${folderName}`);
      }

      // Import emails
      const emailsFile = zipData.file(`${folderName}/emails.json`);
      if (emailsFile) {
        console.log(`Found emails.json for ${folderName}`);
        const emailsContent = await emailsFile.async('text');
        const emails: Omit<EmailData, 'folderId'>[] = JSON.parse(emailsContent);
        console.log(`Found ${emails.length} emails in ${folderName}`);
        
        const emailsWithFolderId = emails.map(email => ({
          ...email,
          folderId,
          isRead: false
        }));
        
        await db.emails.bulkAdd(emailsWithFolderId);
        console.log(`Imported ${emails.length} emails for ${folderName}`);
      } else {
        console.log(`No emails.json found for ${folderName}`);
      }
    }

    // Import attachments
    console.log('Importing attachments...');
    const attachmentPromises: Promise<void>[] = [];
    const attachmentsFolder = zipData.folder('attachments');
    if (attachmentsFolder) {
      console.log('Found attachments folder');
      attachmentsFolder.forEach((relativePath, file) => {
        if (!file.dir) {
          const guid = relativePath;
          console.log('Processing attachment:', guid);
          attachmentPromises.push(
            file.async('arraybuffer').then(async (data) => {
              await db.attachments.add({ guid, data });
              console.log(`Imported attachment: ${guid} (${data.byteLength} bytes)`);
            })
          );
        }
      });
    } else {
      console.log('No attachments folder found');
    }

    await Promise.all(attachmentPromises);
    console.log(`Imported ${attachmentPromises.length} attachments`);
    console.log('ZIP import completed successfully!');
  }
}