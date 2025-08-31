import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';
import type { PDFDocumentInfo } from '../utils/types';

interface UploadSectionProps {
  pdfInfo: PDFDocumentInfo;
  onFileDrop: (event: React.DragEvent) => void;
  onFileInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPageChange: (pageNum: number) => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  pdfInfo,
  onFileDrop,
  onFileInput,
  onPageChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className='lg:col-span-1'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Upload className='w-5 h-5' />
          Upload PDF
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div
          className='border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors'
          onDragOver={handleDragOver}
          onDrop={onFileDrop}
          onClick={handleClick}
        >
          <Upload className='w-8 h-8 mx-auto mb-2 text-muted-foreground' />
          <p className='text-sm text-muted-foreground'>
            {pdfInfo.file
              ? pdfInfo.file.name
              : 'Drop PDF here or click to upload'}
          </p>
        </div>
        <input
          ref={fileInputRef}
          type='file'
          accept='.pdf'
          onChange={onFileInput}
          className='hidden'
        />

        {/* Page Navigation */}
        {pdfInfo.isLoaded && pdfInfo.totalPages > 1 && (
          <div className='space-y-2'>
            <Label>
              Page {pdfInfo.currentPage} of {pdfInfo.totalPages}
            </Label>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => onPageChange(pdfInfo.currentPage - 1)}
                disabled={pdfInfo.currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => onPageChange(pdfInfo.currentPage + 1)}
                disabled={pdfInfo.currentPage === pdfInfo.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Resolution Info */}
        {pdfInfo.isLoaded && (
          <div className='space-y-2'>
            <Label className='text-emerald-600'>Resolution: 300 DPI</Label>
            <p className='text-xs text-muted-foreground'>
              High-resolution image for precise measurements
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
