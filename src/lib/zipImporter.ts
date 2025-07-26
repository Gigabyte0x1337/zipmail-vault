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

    // Import export index and get folder info
    console.log('Looking for export-index.json...');
    const exportIndexFile = zipData.file('export-index.json');
    let exportIndex: ExportIndex | null = null;
    
    if (exportIndexFile) {
      console.log('Found export-index.json, importing...');
      const exportIndexContent = await exportIndexFile.async('text');
      exportIndex = JSON.parse(exportIndexContent);
      await db.exportIndex.add(exportIndex);
      console.log('Export index imported:', exportIndex);
    } else {
      console.log('No export-index.json found');
    }

    // Process folders - try multiple approaches
    console.log('Processing folders...');
    const folders: { [key: string]: string } = {};
    
    // First, try to get folders from export index if available
    if (exportIndex) {
      console.log('Using folders from export index:', exportIndex.Folders);
      
      // Try both Name and SafeName from export index
      for (const folder of exportIndex.Folders) {
        console.log('Checking folder:', folder);
        // Check if SafeName folder exists
        if (zipData.file(`${folder.SafeName}/emails.json`)) {
          folders[folder.SafeName] = folder.SafeName;
          console.log('Found folder using SafeName:', folder.SafeName);
        }
        // Also try the regular name
        else if (zipData.file(`${folder.Name}/emails.json`)) {
          folders[folder.Name] = folder.Name;
          console.log('Found folder using Name:', folder.Name);
        } else {
          console.log('Could not find emails.json for folder:', folder.Name, 'or', folder.SafeName);
        }
      }
    }
    
    // Fallback: scan for directories
    if (Object.keys(folders).length === 0) {
      console.log('No folders found via export index, scanning for directories...');
      for (const [path, zipEntry] of Object.entries(zipData.files)) {
        console.log('ZIP entry:', path, 'isDir:', zipEntry.dir);
        if (zipEntry.dir && path !== 'attachments/') {
          const folderName = path.replace('/', '');
          folders[folderName] = folderName;
          console.log('Found folder via scanning:', folderName);
        }
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
        const emails: Omit<EmailData, 'folderId'>[] = JSON.parse(emailsContent.trim());
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
