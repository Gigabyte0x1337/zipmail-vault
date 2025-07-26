import JSZip from 'jszip';
import { db, EmailData, FolderInfo, ExportIndex } from './database';

export class ZipImporter {
  async importZipFile(
    file: File,
    onProgress?: (progress: number, opsPerSecond: number) => void
  ): Promise<void> {
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

    // ------------------------------------------------------------
    // Discover folders in the ZIP just like before
    // ------------------------------------------------------------
    console.log('Processing folders...');
    const folders: { [key: string]: string } = {};

    // First, try to get folders from export index if available
    if (exportIndex) {
      console.log('Using folders from export index:', exportIndex.Folders);

      // Try both Name and SafeName from export index
      for (const folder of exportIndex.Folders) {
        // Check if SafeName folder exists
        if (zipData.file(`${folder.SafeName}/emails.json`)) {
          folders[folder.SafeName] = folder.SafeName;
        }
        // Also try the regular name
        else if (zipData.file(`${folder.Name}/emails.json`)) {
          folders[folder.Name] = folder.Name;
        }
      }
    }

    // Fallback: scan for directories containing emails.json
    if (Object.keys(folders).length === 0) {
      for (const path of Object.keys(zipData.files)) {
        if (path.includes('/emails.json')) {
          const folderName = path.split('/')[0];
          if (folderName && folderName !== 'attachments') {
            folders[folderName] = folderName;
          }
        }
      }
    }

    console.log('Total folders found:', Object.keys(folders).length, folders);

    // ------------------------------------------------------------
    // Calculate total operations (folders + emails + attachments)
    // ------------------------------------------------------------
    let totalOperations = 0;
    const folderEmailData: Record<string, Omit<EmailData, 'folderId'>[]> = {};

    // Count folders (each folder-info write counts as an op)
    totalOperations += Object.keys(folders).length;

    // Also determine number of emails per folder (and cache them)
    for (const folderName of Object.keys(folders)) {
      const emailsFile = zipData.file(`${folderName}/emails.json`);
      if (emailsFile) {
        const emailsContent = await emailsFile.async('text');
        const emails: Omit<EmailData, 'folderId'>[] = JSON.parse(emailsContent.trim());
        folderEmailData[folderName] = emails;
        totalOperations += emails.length; // each email write counts
      } else {
        folderEmailData[folderName] = [];
      }
    }

    // Count attachments
    const attachmentsFolder = zipData.folder('attachments');
    let attachmentCount = 0;
    if (attachmentsFolder) {
      attachmentsFolder.forEach((relativePath, file) => {
        if (!file.dir) attachmentCount++;
      });
    }
    totalOperations += attachmentCount;

    console.log('Total operations estimated:', totalOperations);

    // ------------------------------------------------------------
    // Begin import while tracking progress
    // ------------------------------------------------------------
    const startTime = performance.now();
    let completedOperations = 0;

    const reportProgress = () => {
      if (!onProgress) return;
      const elapsed = (performance.now() - startTime) / 1000;
      const opsPerSecond = elapsed > 0 ? completedOperations / elapsed : 0;
      const progressPercent = totalOperations > 0 ? (completedOperations / totalOperations) * 100 : 0;
      onProgress(Math.min(progressPercent, 100), opsPerSecond);
    };

    // ---------------------------------
    // Import folder info + emails
    // ---------------------------------
    for (const folderName of Object.keys(folders)) {
      const folderId = folderName;
      // Import folder info
      const folderInfoFile = zipData.file(`${folderName}/folder-info.json`);
      if (folderInfoFile) {
        const folderInfoContent = await folderInfoFile.async('text');
        const folderInfo: FolderInfo = { ...JSON.parse(folderInfoContent), id: folderId };
        await db.folders.add(folderInfo);
      }
      completedOperations++; // folder-info write done
      reportProgress();

      // Import emails for this folder (already parsed)
      const emailsCached = folderEmailData[folderName] || [];
      if (emailsCached.length) {
        const emailsWithFolderId = emailsCached.map((email) => ({
          ...email,
          folderId,
          isRead: false,
        }));
        await db.emails.bulkPut(emailsWithFolderId);
      }
      completedOperations += emailsCached.length;
      reportProgress();
    }

    // ---------------------------------
    // Import attachments
    // ---------------------------------
    console.log('Importing attachments...');
    const attachmentPromises: Promise<void>[] = [];
    if (attachmentsFolder) {
      attachmentsFolder.forEach((relativePath, file) => {
        if (!file.dir) {
          const guid = relativePath;
          attachmentPromises.push(
            file.async('arraybuffer').then(async (data) => {
              await db.attachments.put({ guid, data });
              completedOperations++;
              reportProgress();
            })
          );
        }
      });
    }

    await Promise.all(attachmentPromises);
    reportProgress(); // final report should hit 100%

    console.log('ZIP import completed successfully!');

    // Final verification
    const finalFolderCount = await db.folders.count();
    const finalEmailCount = await db.emails.count();
    console.log('Final verification - Folders:', finalFolderCount, 'Emails:', finalEmailCount);
  }
}
