import { useState, useEffect } from 'react';
import { EmailUpload } from '@/components/EmailUpload';
import { EmailClient } from '@/components/EmailClient';
import { db } from '@/lib/database';

const Index = () => {
  const [hasData, setHasData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkForExistingData();
  }, []);

  const checkForExistingData = async () => {
    try {
      const folderCount = await db.folders.count();
      setHasData(folderCount > 0);
    } catch (error) {
      console.error('Failed to check for existing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportComplete = () => {
    setHasData(true);
  };

  const handleBackToUpload = () => {
    setHasData(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (hasData) {
    return <EmailClient onBackToUpload={handleBackToUpload} />;
  }

  return <EmailUpload onImportComplete={handleImportComplete} />;
};

export default Index;
