import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Scan } from 'lucide-react';
import type { OCRSettings } from '../utils/types';

interface OCRSettingsProps {
  settings: OCRSettings;
  onSettingsChange: (settings: Partial<OCRSettings>) => void;
  onPerformOCR: () => void;
  isProcessing: boolean;
  isEnabled: boolean;
}

export const OCRSettingsComponent: React.FC<OCRSettingsProps> = ({
  settings,
  onSettingsChange,
  onPerformOCR,
  isProcessing,
  isEnabled,
}) => {
  return (
    <div className='space-y-3'>
      <Label>OCR Settings</Label>
      <div className='grid grid-cols-1 gap-3'>
        <div className='grid grid-cols-2 gap-2'>
          <div>
            <Label className='text-xs'>Language</Label>
            <Select
              value={settings.language}
              onValueChange={(value: 'eng' | 'jpn' | 'eng+jpn') =>
                onSettingsChange({ language: value })
              }
            >
              <SelectTrigger className='h-8'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='eng'>English</SelectItem>
                <SelectItem value='jpn'>Japanese</SelectItem>
                <SelectItem value='eng+jpn'>English + Japanese</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className='text-xs'>Detection Level</Label>
            <Select
              value={settings.level}
              onValueChange={(value: 'word' | 'line' | 'paragraph' | 'block') =>
                onSettingsChange({ level: value })
              }
            >
              <SelectTrigger className='h-8'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='word'>Word</SelectItem>
                <SelectItem value='line'>Line</SelectItem>
                <SelectItem value='paragraph'>Paragraph</SelectItem>
                <SelectItem value='block'>Block</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className='grid grid-cols-2 gap-2'>
          <div>
            <Label className='text-xs'>
              Min Confidence: {settings.minConfidence}%
            </Label>
            <input
              type='range'
              min={0}
              max={100}
              value={settings.minConfidence}
              onChange={(e) =>
                onSettingsChange({ minConfidence: Number(e.target.value) })
              }
              className='w-full'
            />
          </div>
          <div className='flex items-center space-x-2'>
            <input
              type='checkbox'
              id='enhance-image'
              checked={settings.enhanceImage}
              onChange={(e) =>
                onSettingsChange({ enhanceImage: e.target.checked })
              }
              className='rounded'
            />
            <Label htmlFor='enhance-image' className='text-xs'>
              Enhance Image
            </Label>
          </div>
        </div>
      </div>
      <div className='text-xs text-muted-foreground'>
        Enhance Image: コントラスト調整とノイズ除去でOCR精度を向上
      </div>

      {/* OCR Button */}
      <Button
        onClick={onPerformOCR}
        disabled={isProcessing || !isEnabled}
        className='w-full'
        variant='outline'
      >
        <Scan className='w-4 h-4 mr-2' />
        {isProcessing ? 'Processing OCR...' : 'Auto-detect Text'}
      </Button>
      <p className='text-xs text-muted-foreground'>
        Automatically create bounding boxes around detected text
      </p>
    </div>
  );
};
