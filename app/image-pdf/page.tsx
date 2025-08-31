'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Trash2 } from 'lucide-react';

// Import components
import { UploadSection } from './components/UploadSection';
import { PDFViewer } from './components/PDFViewer';
import { OCRSettingsComponent } from './components/OCRSettings';
import { TableDetectionControls } from './components/TableDetectionControls';
import { BoundingBoxesList } from './components/BoundingBoxesList';

// Import hooks
import { usePDF } from './hooks/usePDF';
import { useOCR } from './hooks/useOCR';
import { useBoundingBoxes } from './hooks/useBoundingBoxes';
import { useTableDetection } from './hooks/useTableDetection';

// Import actions
import {
  exportBoundingBoxes,
  exportOCRTextData,
} from './actions/exportActions';

// Import types
import type { Point, BoundingBox } from './utils/types';

export default function ImagePDFTool() {
  // Refs
  const imageRef = useRef<HTMLImageElement>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentBox, setCurrentBox] = useState<BoundingBox | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<'px' | 'mm' | 'pt'>('px');

  // Custom hooks
  const {
    pdfInfo,
    changePage,
    convertDisplayToPDF,
    imageCoordsToPDFPoints,
    handleFileDrop,
    handleFileInput,
  } = usePDF();

  const {
    settings: ocrSettings,
    textData: ocrTextData,
    isProcessing: isOcrProcessing,
    performOCR,
    generateBoundingBoxes,
    updateSettings: updateOCRSettings,
  } = useOCR(pdfInfo.imageDataUrl, convertDisplayToPDF, imageCoordsToPDFPoints);

  const {
    boundingBoxes,
    addBoundingBoxes,
    clearBoundingBoxes,
    removeBoundingBoxesByKind,
    getBoundingBoxesStats,
  } = useBoundingBoxes();

  const {
    mode: tableDetectionMode,
    setMode: setTableDetectionMode,
    isProcessing: isTableProcessing,
    cvLoaded,
    cvError,
    cvLoadingProgress,
    detectTables,
  } = useTableDetection(
    pdfInfo.imageDataUrl,
    convertDisplayToPDF,
    selectedUnit
  );

  // Drawing event handlers
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!pdfInfo.imageDataUrl) return;

      const container = event.currentTarget;
      const rect = container.getBoundingClientRect();
      const imageX = event.clientX - rect.left;
      const imageY = event.clientY - rect.top;

      console.log('[v0] Mouse down - Image:', { x: imageX, y: imageY });

      setIsDrawing(true);
      setStartPoint({ x: imageX, y: imageY });
    },
    [pdfInfo.imageDataUrl]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isDrawing || !startPoint) return;

      const container = event.currentTarget;
      const rect = container.getBoundingClientRect();
      const currentX = event.clientX - rect.left;
      const currentY = event.clientY - rect.top;

      const width = Math.abs(currentX - startPoint.x);
      const height = Math.abs(currentY - startPoint.y);
      const boxX = Math.min(currentX, startPoint.x);
      const boxY = Math.min(currentY, startPoint.y);

      setCurrentBox({
        id: `temp-${Date.now()}`,
        x: boxX,
        y: boxY,
        width: width,
        height: height,
        unit: selectedUnit,
      });
    },
    [isDrawing, startPoint, selectedUnit]
  );

  const handleMouseUp = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isDrawing || !startPoint || !currentBox) return;

      const container = event.currentTarget;
      const rect = container.getBoundingClientRect();
      const currentX = event.clientX - rect.left;
      const currentY = event.clientY - rect.top;

      const width = Math.abs(currentX - startPoint.x);
      const height = Math.abs(currentY - startPoint.y);
      const boxX = Math.min(currentX, startPoint.x);
      const boxY = Math.min(currentY, startPoint.y);

      // Get the image element for coordinate conversion
      const imageElement = imageRef.current || undefined;
      const coords = convertDisplayToPDF(
        boxX,
        boxY,
        width,
        height,
        imageElement
      );

      if (coords && width > 5 && height > 5) {
        console.log('[v0] Creating new bounding box:', {
          displayCoords: { x: boxX, y: boxY, width, height },
          pdfCoords: coords,
          finalBox: {
            x: coords.pt.x,
            y: coords.pt.y,
            width: coords.pt.width,
            height: coords.pt.height,
            unit: 'pt',
            kind: 'manual',
          },
        });

        const newBox = {
          id: `bbox-${Date.now()}`,
          x: coords.pt.x,
          y: coords.pt.y,
          width: coords.pt.width,
          height: coords.pt.height,
          unit: 'pt' as const, // Always store in PDF points
          kind: 'manual' as const,
        };

        addBoundingBoxes([newBox]);
      }

      setIsDrawing(false);
      setStartPoint(null);
      setCurrentBox(null);
    },
    [isDrawing, startPoint, currentBox, convertDisplayToPDF, addBoundingBoxes]
  );

  // Event handlers
  const handlePerformOCR = useCallback(async () => {
    if (!pdfInfo.imageDataUrl) return;
    await performOCR();
    // Note: OCR results will be automatically added via useEffect below
  }, [performOCR, pdfInfo.imageDataUrl]);

  // Automatically generate bounding boxes when OCR text data is updated
  useEffect(() => {
    if (ocrTextData && ocrTextData.words && ocrTextData.words.length > 0) {
      const boxes = generateBoundingBoxes('pt');
      addBoundingBoxes(boxes);
    }
  }, [ocrTextData, generateBoundingBoxes, addBoundingBoxes]);

  const handleDetectTables = useCallback(async () => {
    const boxes = await detectTables();
    addBoundingBoxes(boxes);
  }, [detectTables, addBoundingBoxes]);

  const handleExportBoundingBoxes = useCallback(() => {
    exportBoundingBoxes(boundingBoxes, pdfInfo, {
      language: ocrSettings.language,
      level: ocrSettings.level,
      minConfidence: ocrSettings.minConfidence,
      enhanceImage: ocrSettings.enhanceImage,
    });
  }, [boundingBoxes, pdfInfo, ocrSettings]);

  const handleExportOCRText = useCallback(() => {
    exportOCRTextData(ocrTextData, pdfInfo, {
      language: ocrSettings.language,
      level: ocrSettings.level,
      minConfidence: ocrSettings.minConfidence,
      enhanceImage: ocrSettings.enhanceImage,
    });
  }, [ocrTextData, pdfInfo, ocrSettings]);

  const handleClearTableBoxes = useCallback(() => {
    removeBoundingBoxesByKind('table');
  }, [removeBoundingBoxesByKind]);

  const stats = getBoundingBoxesStats();

  return (
    <div className='min-h-screen bg-background p-6'>
      <div className='max-w-7xl mx-auto'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-foreground mb-2'>
            PDF Image Bounding Box Tool
          </h1>
          <p className='text-muted-foreground'>
            Upload a PDF, convert to 300 DPI image, and draw precise bounding
            boxes or auto-detect text with OCR
          </p>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
          {/* Upload Section */}
          <UploadSection
            pdfInfo={pdfInfo}
            onFileDrop={handleFileDrop}
            onFileInput={handleFileInput}
            onPageChange={changePage}
          />

          {/* PDF Viewer */}
          <PDFViewer
            imageDataUrl={pdfInfo.imageDataUrl}
            boundingBoxes={boundingBoxes}
            selectedUnit={selectedUnit}
            isDrawing={isDrawing}
            currentBox={currentBox}
            originalDimensions={pdfInfo.originalDimensions}
            imageRef={imageRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />

          {/* Controls Panel */}
          <div className='lg:col-span-1 space-y-6'>
            {/* Unit Selection */}
            <div>
              <Label htmlFor='unit-select'>Default Unit</Label>
              <Select
                value={selectedUnit}
                onValueChange={(value: 'px' | 'mm' | 'pt') =>
                  setSelectedUnit(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='px'>Pixels (px)</SelectItem>
                  <SelectItem value='mm'>Millimeters (mm)</SelectItem>
                  <SelectItem value='pt'>Points (pt)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* OCR Settings */}
            {pdfInfo.isLoaded && pdfInfo.imageDataUrl && (
              <OCRSettingsComponent
                settings={ocrSettings}
                onSettingsChange={updateOCRSettings}
                onPerformOCR={handlePerformOCR}
                isProcessing={isOcrProcessing}
                isEnabled={!!pdfInfo.imageDataUrl}
              />
            )}

            {/* Table Detection Controls */}
            {pdfInfo.isLoaded && pdfInfo.imageDataUrl && (
              <TableDetectionControls
                mode={tableDetectionMode}
                onModeChange={setTableDetectionMode}
                onDetectTables={handleDetectTables}
                isProcessing={isTableProcessing}
                isEnabled={!!pdfInfo.imageDataUrl}
                cvLoaded={cvLoaded}
                cvError={cvError}
                cvLoadingProgress={cvLoadingProgress}
              />
            )}

            {/* Action Buttons */}
            {pdfInfo.isLoaded && (
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={clearBoundingBoxes}
                  disabled={boundingBoxes.length === 0}
                >
                  <Trash2 className='w-4 h-4 mr-1' />
                  Clear All
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleClearTableBoxes}
                  disabled={stats.hasTable === false}
                >
                  <Trash2 className='w-4 h-4 mr-1' />
                  Clear Table
                </Button>
                <Button
                  size='sm'
                  onClick={handleExportBoundingBoxes}
                  disabled={boundingBoxes.length === 0}
                >
                  <Download className='w-4 h-4 mr-2' />
                  Export BBoxes
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={handleExportOCRText}
                  disabled={!ocrTextData}
                >
                  <Download className='w-4 h-4 mr-2' />
                  Export OCR Text
                </Button>
              </div>
            )}
          </div>

          {/* Bounding Boxes List */}
          <BoundingBoxesList
            boundingBoxes={boundingBoxes}
            ocrTextData={ocrTextData}
            selectedUnit={selectedUnit}
          />
        </div>
      </div>
    </div>
  );
}
