import { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ZipImporter } from '@/lib/zipImporter';

interface EmailUploadProps {
  onImportComplete: () => void;
}

export function EmailUpload({ onImportComplete }: EmailUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a ZIP file containing email data.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const importer = new ZipImporter();
      await importer.importZipFile(file);
      
      toast({
        title: "Import successful",
        description: "Email data has been imported successfully.",
      });
      
      onImportComplete();
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: "Import failed",
        description: "Failed to import email data. Please check the file format.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <Upload className="h-16 w-16 mx-auto text-primary mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Email Client</h1>
            <p className="text-muted-foreground">
              Upload a ZIP file containing your email export to get started
            </p>
          </div>
          
          <div className="space-y-4">
            <input
              id="zip-upload"
              type="file"
              accept=".zip"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
            <Button
              onClick={() => document.getElementById('zip-upload')?.click()}
              disabled={isUploading}
              className="w-full"
              size="lg"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload ZIP File
                </>
              )}
            </Button>
          </div>

          <div className="mt-6 text-xs text-muted-foreground">
            <p>Expected ZIP structure:</p>
            <ul className="text-left mt-2 space-y-1">
              <li>• export-index.json</li>
              <li>• folder-name/emails.json</li>
              <li>• folder-name/folder-info.json</li>
              <li>• attachments/[guid-files]</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}