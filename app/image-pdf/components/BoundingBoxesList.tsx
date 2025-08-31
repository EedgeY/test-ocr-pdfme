import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { BoundingBox, OCRTextData } from '../utils/types';

interface BoundingBoxesListProps {
  boundingBoxes: BoundingBox[];
  ocrTextData: OCRTextData | null;
  selectedUnit: 'px' | 'mm' | 'pt';
}

export const BoundingBoxesList: React.FC<BoundingBoxesListProps> = ({
  boundingBoxes,
  ocrTextData,
  selectedUnit,
}) => {
  const tableBoxes = boundingBoxes.filter((box) => box.kind === 'table');
  const lineBoxes = tableBoxes.filter((box) => box.id.includes('line'));
  const cellBoxes = tableBoxes.filter((box) => box.id.includes('cell'));
  const regionBoxes = tableBoxes.filter(
    (box) => !box.id.includes('line') && !box.id.includes('cell')
  );

  const getBoxType = (box: BoundingBox) => {
    if (box.id.includes('hline')) return 'Horizontal Line';
    if (box.id.includes('vline')) return 'Vertical Line';
    if (box.id.includes('cell')) return 'Table Cell';
    if (box.kind === 'table') return 'Table Region';
    if (box.kind === 'ocr') return 'OCR Text';
    return 'Manual Box';
  };

  const getTypeColor = (box: BoundingBox) => {
    if (box.kind === 'ocr') return 'text-amber-600';
    if (box.id.includes('line')) return 'text-red-600';
    if (box.id.includes('cell')) return 'text-blue-600';
    if (box.kind === 'table') return 'text-purple-600';
    return 'text-emerald-600';
  };

  const convertToUnits = (
    value: number,
    fromUnit: 'px' | 'mm' | 'pt',
    toUnit: 'px' | 'mm' | 'pt'
  ) => {
    if (fromUnit === toUnit) return value;

    // Convert to points first, then to target unit
    let points: number;
    if (fromUnit === 'px') {
      points = value * 0.75; // pixels to points
    } else if (fromUnit === 'mm') {
      points = value * 2.834645669; // mm to points
    } else {
      points = value; // already in points
    }

    let result: number;
    if (toUnit === 'px') {
      result = points / 0.75; // points to pixels
    } else if (toUnit === 'mm') {
      result = points / 2.834645669; // points to mm
    } else {
      result = points; // keep as points
    }

    return Math.round(result * 100) / 100;
  };

  return (
    <Card className='lg:col-span-1'>
      <CardHeader>
        <CardTitle>
          Bounding Boxes ({boundingBoxes.length})
          {tableBoxes.length > 0 && (
            <div className='text-sm font-normal text-muted-foreground mt-1'>
              Table: {regionBoxes.length} regions, {lineBoxes.length} lines,{' '}
              {cellBoxes.length} cells
            </div>
          )}
          {ocrTextData && (
            <div className='text-sm font-normal text-amber-600 mt-1'>
              OCR: {ocrTextData.words?.length || 0} words,{' '}
              {ocrTextData.lines?.length || 0} lines (
              {Math.round(ocrTextData.confidence || 0)}% confidence)
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-3 max-h-[600px] overflow-y-auto'>
          {boundingBoxes.map((box, index) => {
            const ptValues = {
              x: convertToUnits(box.x, box.unit, 'pt'),
              y: convertToUnits(box.y, box.unit, 'pt'),
              width: convertToUnits(box.width, box.unit, 'pt'),
              height: convertToUnits(box.height, box.unit, 'pt'),
            };

            const pxValues = {
              x: convertToUnits(box.x, box.unit, 'px'),
              y: convertToUnits(box.y, box.unit, 'px'),
              width: convertToUnits(box.width, box.unit, 'px'),
              height: convertToUnits(box.height, box.unit, 'px'),
            };

            const mmValues = {
              x: convertToUnits(box.x, box.unit, 'mm'),
              y: convertToUnits(box.y, box.unit, 'mm'),
              width: convertToUnits(box.width, box.unit, 'mm'),
              height: convertToUnits(box.height, box.unit, 'mm'),
            };

            console.log('[v0] BoundingBoxesList mm conversion for box:', {
              box: {
                id: box.id,
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
                unit: box.unit,
              },
              mmValues,
              calculations: {
                x_mm: box.x / 2.834645669,
                y_mm: box.y / 2.834645669,
                width_mm: box.width / 2.834645669,
                height_mm: box.height / 2.834645669,
              },
            });

            return (
              <div
                key={box.id}
                className='p-3 border border-border rounded-lg text-sm'
              >
                <div className='font-medium mb-2'>
                  <span className={`font-semibold ${getTypeColor(box)}`}>
                    {getBoxType(box)}
                  </span>
                  <span className='text-muted-foreground ml-1'>
                    #{index + 1}
                  </span>
                </div>

                <div className='space-y-2'>
                  <div className='text-xs'>
                    <div className='font-medium text-emerald-600 mb-1'>
                      Points (pt)
                    </div>
                    <div className='grid grid-cols-2 gap-1 text-muted-foreground'>
                      <div>X: {ptValues.x}</div>
                      <div>Y: {ptValues.y}</div>
                      <div>W: {ptValues.width}</div>
                      <div>H: {ptValues.height}</div>
                    </div>
                  </div>

                  <div className='text-xs'>
                    <div className='font-medium text-blue-600 mb-1'>
                      Pixels (px)
                    </div>
                    <div className='grid grid-cols-2 gap-1 text-muted-foreground'>
                      <div>X: {pxValues.x}</div>
                      <div>Y: {pxValues.y}</div>
                      <div>W: {pxValues.width}</div>
                      <div>H: {pxValues.height}</div>
                    </div>
                  </div>

                  <div className='text-xs'>
                    <div className='font-medium text-purple-600 mb-1'>
                      Millimeters (mm)
                    </div>
                    <div className='grid grid-cols-2 gap-1 text-muted-foreground'>
                      <div>X: {mmValues.x}</div>
                      <div>Y: {mmValues.y}</div>
                      <div>W: {mmValues.width}</div>
                      <div>H: {mmValues.height}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {boundingBoxes.length === 0 && (
            <div className='text-center text-muted-foreground py-8'>
              No bounding boxes yet. Draw on the image to create them.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
