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
import type { TableDetectionMode } from '../utils/types';

interface TableDetectionControlsProps {
  mode: TableDetectionMode;
  onModeChange: (mode: TableDetectionMode) => void;
  onDetectTables: () => void;
  isProcessing: boolean;
  isEnabled: boolean;
  cvLoaded: boolean;
  cvError: string | null;
  cvLoadingProgress: number;
}

export const TableDetectionControls: React.FC<TableDetectionControlsProps> = ({
  mode,
  onModeChange,
  onDetectTables,
  isProcessing,
  isEnabled,
  cvLoaded,
  cvError,
  cvLoadingProgress,
}) => {
  return (
    <div className='space-y-2'>
      <Label>Table Detection Mode</Label>
      <Select
        value={mode}
        onValueChange={(value: TableDetectionMode) => onModeChange(value)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='table'>Table Regions</SelectItem>
          <SelectItem value='lines'>Lines (Rows/Columns)</SelectItem>
          <SelectItem value='cells'>Individual Cells</SelectItem>
        </SelectContent>
      </Select>

      <Button
        onClick={onDetectTables}
        disabled={isProcessing || !isEnabled}
        className='w-full'
        variant='outline'
      >
        {cvLoaded
          ? mode === 'table' && 'Detect Table Regions'
          : mode === 'table' && 'Detect Tables (Fallback)'}
        {cvLoaded
          ? mode === 'lines' && 'Detect Table Lines'
          : mode === 'lines' && 'Detect Lines (Fallback)'}
        {cvLoaded
          ? mode === 'cells' && 'Detect Table Cells'
          : mode === 'cells' && 'Detect Cells (Fallback)'}
        {isProcessing ? ' (Processing...)' : ''}
      </Button>

      <div className='text-xs text-muted-foreground space-y-1'>
        <div>
          {mode === 'table' && 'Detect whole table regions'}
          {mode === 'lines' && 'Detect individual row/column lines'}
          {mode === 'cells' && 'Detect individual table cells'}
          {' using OpenCV'}
        </div>
        <div className='flex items-center gap-2'>
          <div
            className={`w-2 h-2 rounded-full ${
              cvLoaded
                ? 'bg-green-500'
                : cvError
                ? 'bg-red-500 animate-pulse'
                : 'bg-yellow-500 animate-pulse'
            }`}
          />
          <span>
            {cvLoaded
              ? 'OpenCV Ready'
              : cvError
              ? 'OpenCV Error - Check Console'
              : `Loading OpenCV... ${cvLoadingProgress.toFixed(0)}%`}
          </span>
        </div>
        {!cvLoaded && !cvError && (
          <>
            <div className='w-full bg-gray-200 rounded-full h-2 mt-1'>
              <div
                className='bg-blue-600 h-2 rounded-full transition-all duration-300'
                style={{ width: `${cvLoadingProgress}%` }}
              />
            </div>
            <div className='text-xs text-yellow-600'>
              OpenCV.jsの読み込みには時間がかかる場合があります。数秒待ってください。
            </div>
          </>
        )}
        {cvError && (
          <div className='text-red-500 space-y-1'>
            <div>エラー: {cvError}</div>
            <div className='text-xs'>
              解決策:
              ページをリロードするか、ネットワーク接続を確認してください。
            </div>
          </div>
        )}
        {cvLoaded && (
          <div className='text-xs text-green-600'>
            ✅ OpenCV.jsが正常に読み込まれています。表検出を実行できます。
          </div>
        )}
      </div>
    </div>
  );
};
