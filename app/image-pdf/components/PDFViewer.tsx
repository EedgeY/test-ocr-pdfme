import React, { RefObject } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BoundingBox, Point } from '../utils/types';
import { pdfPointsToDisplayCoords } from '../utils/coordinateConversion';

interface PDFViewerProps {
  imageDataUrl: string | null;
  boundingBoxes: BoundingBox[];
  selectedUnit: 'px' | 'mm' | 'pt';
  isDrawing: boolean;
  currentBox: BoundingBox | null;
  originalDimensions: { width: number; height: number } | null;
  imageRef: RefObject<HTMLImageElement | null>;
  onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  imageDataUrl,
  boundingBoxes,
  selectedUnit,
  isDrawing,
  currentBox,
  originalDimensions,
  imageRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}) => {
  // Convert bounding box coordinates to display coordinates
  const convertBoxToDisplay = (box: BoundingBox) => {
    if (!originalDimensions || !imageRef.current) {
      console.log(
        '[v0] PDFViewer convertBoxToDisplay: missing dimensions or image element'
      );
      // Fallback: return box coordinates as-is if conversion not possible
      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      };
    }

    console.log('[v0] PDFViewer converting box:', box);

    // Convert to PDF points (native coordinate system)
    let pdfX = box.x;
    let pdfY = box.y;
    let pdfWidth = box.width;
    let pdfHeight = box.height;

    // All bounding boxes should now be stored in PDF points (pt) unit
    // For backward compatibility, handle different units if they exist
    if (box.unit === 'px') {
      // Convert pixels to points
      pdfX = box.x * 0.75;
      pdfY = box.y * 0.75;
      pdfWidth = box.width * 0.75;
      pdfHeight = box.height * 0.75;
    } else if (box.unit === 'mm') {
      // Convert millimeters to points
      pdfX = box.x * 2.834645669;
      pdfY = box.y * 2.834645669;
      pdfWidth = box.width * 2.834645669;
      pdfHeight = box.height * 2.834645669;
    }
    // If unit is 'pt', use as-is (this should be the normal case)

    console.log('[v0] PDFViewer PDF points:', {
      pdfX,
      pdfY,
      pdfWidth,
      pdfHeight,
    });
    console.log('[v0] PDFViewer originalDimensions:', originalDimensions);
    console.log('[v0] PDFViewer image dimensions:', {
      width: imageRef.current.clientWidth,
      height: imageRef.current.clientHeight,
    });

    const displayCoords = pdfPointsToDisplayCoords(
      pdfX,
      pdfY,
      pdfWidth,
      pdfHeight,
      originalDimensions,
      imageRef.current
    );

    console.log('[v0] PDFViewer final display coords:', displayCoords);

    return (
      displayCoords || {
        x: pdfX,
        y: pdfY,
        width: pdfWidth,
        height: pdfHeight,
      }
    );
  };

  const getBoxStyle = (box: BoundingBox) => {
    let borderColor: string;
    let backgroundColor: string;
    const borderWidth =
      box.kind === 'ocr' || box.kind === 'table' ? '2px' : '2px';

    if (box.kind === 'ocr') {
      borderColor = '#f59e0b'; // amber-500
      backgroundColor = 'rgba(245, 158, 11, 0.1)';
    } else if (box.id.includes('line')) {
      borderColor = '#ef4444'; // red-500 for lines
      backgroundColor = 'rgba(239, 68, 68, 0.2)';
    } else if (box.id.includes('cell')) {
      borderColor = '#3b82f6'; // blue-500 for cells
      backgroundColor = 'rgba(59, 130, 246, 0.1)';
    } else if (
      box.kind === 'table' &&
      !box.id.includes('line') &&
      !box.id.includes('cell')
    ) {
      borderColor = '#8b5cf6'; // purple-500 for table regions
      backgroundColor = 'rgba(139, 92, 246, 0.1)';
    } else {
      borderColor = '#10b981'; // emerald-500 for manual
      backgroundColor = 'rgba(16, 185, 129, 0.1)';
    }

    return {
      border: `${borderWidth} solid ${borderColor}`,
      backgroundColor,
    };
  };

  const getBoxLabel = (box: BoundingBox, index: number) => {
    if (box.id.includes('hline')) return '─';
    if (box.id.includes('vline')) return '│';
    if (box.id.includes('cell')) return '■';
    return (index + 1).toString();
  };

  const getLabelColor = (box: BoundingBox) => {
    if (box.kind === 'ocr') return '#f59e0b';
    if (box.id.includes('line')) return '#ef4444';
    if (box.id.includes('cell')) return '#3b82f6';
    if (box.kind === 'table') return '#8b5cf6';
    return '#10b981';
  };

  return (
    <Card className='lg:col-span-2'>
      <CardHeader>
        <CardTitle>PDF Image Viewer (300 DPI)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='relative border border-border rounded-lg overflow-hidden bg-muted min-h-[600px]'>
          {imageDataUrl ? (
            <div className='relative overflow-auto max-h-[600px]'>
              <div
                className='relative cursor-crosshair'
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
              >
                <img
                  ref={imageRef}
                  id='pdf-image'
                  src={imageDataUrl}
                  alt='PDF Page'
                  className='block max-w-full h-auto'
                  draggable={false}
                />

                <div className='absolute inset-0 pointer-events-none'>
                  {/* Existing bounding boxes */}
                  {boundingBoxes.map((box, index) => {
                    const displayCoords = convertBoxToDisplay(box);

                    return (
                      <div
                        key={box.id}
                        className='absolute'
                        style={{
                          ...getBoxStyle(box),
                          left: displayCoords.x,
                          top: displayCoords.y,
                          width: displayCoords.width,
                          height: displayCoords.height,
                        }}
                      >
                        <div
                          className='absolute -top-6 left-0 text-white text-xs px-1 rounded'
                          style={{
                            backgroundColor: getLabelColor(box),
                          }}
                        >
                          {getBoxLabel(box, index)}
                        </div>
                      </div>
                    );
                  })}

                  {/* Current drawing box */}
                  {isDrawing && currentBox && (
                    <div
                      className='absolute border-2 border-emerald-400 border-dashed'
                      style={{
                        left: convertBoxToDisplay(currentBox).x,
                        top: convertBoxToDisplay(currentBox).y,
                        width: convertBoxToDisplay(currentBox).width,
                        height: convertBoxToDisplay(currentBox).height,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className='flex items-center justify-center h-[600px] text-muted-foreground'>
              Upload a PDF to get started
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
