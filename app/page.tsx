'use client';

import type React from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, Download, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import Link from 'next/link';

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  unit: 'px' | 'mm' | 'pt';
}

interface Point {
  x: number;
  y: number;
}

export default function PDFBboxTool() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [boundingBoxes, setBoundingBoxes] = useState<BoundingBox[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentBox, setCurrentBox] = useState<BoundingBox | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<'px' | 'mm' | 'pt'>('px');
  const [zoom, setZoom] = useState(1);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        console.log('[v0] PDF.js loaded successfully');
      }
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Unit conversion functions
  const convertUnits = useCallback(
    (value: number, from: string, to: string): number => {
      // Convert to points first (base unit)
      let ptValue: number;
      switch (from) {
        case 'pt':
          ptValue = value;
          break;
        case 'px':
          ptValue = value * 0.75; // 1px = 0.75pt at 96 DPI
          break;
        case 'mm':
          ptValue = value * 2.834645669; // 1mm = 2.834645669pt
          break;
        default:
          ptValue = value;
      }

      // Convert from points to target unit
      switch (to) {
        case 'pt':
          return ptValue;
        case 'px':
          return ptValue / 0.75; // 1pt = 1.333px at 96 DPI
        case 'mm':
          return ptValue / 2.834645669; // 1pt = 0.352777778mm
        default:
          return ptValue;
      }
    },
    []
  );

  // PDF coordinate system conversion functions
  const convertCanvasToPDF = useCallback(
    async (
      canvasX: number,
      canvasY: number,
      canvasWidth: number,
      canvasHeight: number
    ) => {
      if (!pdfDocument) return null;

      const page = await pdfDocument.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1 }); // Actual PDF size
      const displayViewport = page.getViewport({ scale: zoom }); // Display size

      // Scale factors
      const scaleX = viewport.width / displayViewport.width;
      const scaleY = viewport.height / displayViewport.height;

      // Convert canvas coordinates directly to PDF coordinates without Y-axis inversion
      const pdfX = canvasX * scaleX;
      const pdfY = canvasY * scaleY;
      const pdfWidth = canvasWidth * scaleX;
      const pdfHeight = canvasHeight * scaleY;

      console.log('[v0] Coordinate conversion:', {
        canvas: { x: canvasX, y: canvasY, w: canvasWidth, h: canvasHeight },
        pdf: { x: pdfX, y: pdfY, w: pdfWidth, h: pdfHeight },
        viewport: { w: viewport.width, h: viewport.height },
        display: { w: displayViewport.width, h: displayViewport.height },
      });

      return {
        // PDF coordinates in points (native PDF unit)
        pt: {
          x: Math.round(pdfX * 100) / 100,
          y: Math.round(pdfY * 100) / 100,
          width: Math.round(pdfWidth * 100) / 100,
          height: Math.round(pdfHeight * 100) / 100,
        },
        // Convert to pixels (96 DPI standard)
        px: {
          x: Math.round((pdfX / 0.75) * 100) / 100,
          y: Math.round((pdfY / 0.75) * 100) / 100,
          width: Math.round((pdfWidth / 0.75) * 100) / 100,
          height: Math.round((pdfHeight / 0.75) * 100) / 100,
        },
        // Convert to millimeters
        mm: {
          x: Math.round((pdfX / 2.834645669) * 100) / 100,
          y: Math.round((pdfY / 2.834645669) * 100) / 100,
          width: Math.round((pdfWidth / 2.834645669) * 100) / 100,
          height: Math.round((pdfHeight / 2.834645669) * 100) / 100,
        },
      };
    },
    [pdfDocument, currentPage, zoom]
  );

  const convertPDFToCanvas = useCallback(
    async (pdfX: number, pdfY: number, pdfWidth: number, pdfHeight: number) => {
      if (!pdfDocument) return null;

      const page = await pdfDocument.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1 });
      const displayViewport = page.getViewport({ scale: zoom });

      // Scale factors
      const scaleX = displayViewport.width / viewport.width;
      const scaleY = displayViewport.height / viewport.height;

      // Convert PDF coordinates directly to canvas coordinates without Y-axis inversion
      const canvasX = pdfX * scaleX;
      const canvasY = pdfY * scaleY;
      const canvasWidth = pdfWidth * scaleX;
      const canvasHeight = pdfHeight * scaleY;

      return {
        x: canvasX,
        y: canvasY,
        width: canvasWidth,
        height: canvasHeight,
      };
    },
    [pdfDocument, currentPage, zoom]
  );

  const renderPDFPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDocument || !canvasRef.current) return;

      try {
        const page = await pdfDocument.getPage(pageNum);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        const viewport = page.getViewport({ scale: zoom });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        canvas.dataset.viewportWidth = viewport.width.toString();
        canvas.dataset.viewportHeight = viewport.height.toString();
        canvas.dataset.viewportScale = viewport.scale.toString();

        // Also update overlay canvas
        if (overlayCanvasRef.current) {
          overlayCanvasRef.current.height = viewport.height;
          overlayCanvasRef.current.width = viewport.width;
          overlayCanvasRef.current.dataset.viewportWidth =
            viewport.width.toString();
          overlayCanvasRef.current.dataset.viewportHeight =
            viewport.height.toString();
          overlayCanvasRef.current.dataset.viewportScale =
            viewport.scale.toString();
        }

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
        console.log('[v0] PDF page rendered successfully');
      } catch (error) {
        console.error('[v0] Error rendering PDF page:', error);
      }
    },
    [pdfDocument, zoom]
  );

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type === 'application/pdf') {
        console.log('[v0] PDF file selected:', file.name);
        setPdfFile(file);
        setBoundingBoxes([]);
        setPdfLoaded(false);

        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer })
            .promise;
          setPdfDocument(pdf);
          setTotalPages(pdf.numPages);
          setCurrentPage(1);
          setPdfLoaded(true);
          console.log('[v0] PDF loaded with', pdf.numPages, 'pages');
        } catch (error) {
          console.error('[v0] Error loading PDF:', error);
        }
      }
    },
    []
  );

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      console.log('[v0] PDF file dropped:', file.name);
      setPdfFile(file);
      setBoundingBoxes([]);
      setPdfLoaded(false);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer })
          .promise;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        setPdfLoaded(true);
        console.log('[v0] PDF loaded with', pdf.numPages, 'pages');
      } catch (error) {
        console.error('[v0] Error loading PDF:', error);
      }
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = overlayCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const canvasX = event.clientX - rect.left;
      const canvasY = event.clientY - rect.top;

      console.log('[v0] Mouse down - Canvas:', { x: canvasX, y: canvasY });

      setIsDrawing(true);
      setStartPoint({ x: canvasX, y: canvasY });
    },
    []
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !startPoint) return;

      const canvas = overlayCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
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

  const handleMouseUp = useCallback(async () => {
    if (!isDrawing || !startPoint || !currentBox) return;

    const coords = await convertCanvasToPDF(
      currentBox.x,
      currentBox.y,
      currentBox.width,
      currentBox.height
    );

    if (coords && currentBox.width > 5 && currentBox.height > 5) {
      const newBox: BoundingBox = {
        id: `bbox-${Date.now()}`,
        x: coords.pt.x,
        y: coords.pt.y,
        width: coords.pt.width,
        height: coords.pt.height,
        unit: selectedUnit,
      };

      setBoundingBoxes((prev) => [...prev, newBox]);
      console.log('[v0] Added bounding box:', newBox, 'Conversions:', coords);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentBox(null);
  }, [isDrawing, startPoint, currentBox, selectedUnit, convertCanvasToPDF]);

  useEffect(() => {
    if (pdfDocument && pdfLoaded) {
      renderPDFPage(currentPage);
    }
  }, [pdfDocument, currentPage, zoom, pdfLoaded, renderPDFPage]);

  // Draw bounding boxes on overlay canvas
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing bounding boxes
    const drawExistingBoxes = async () => {
      for (let i = 0; i < boundingBoxes.length; i++) {
        const box = boundingBoxes[i];
        const canvasCoords = await convertPDFToCanvas(
          box.x,
          box.y,
          box.width,
          box.height
        );

        if (canvasCoords) {
          ctx.strokeStyle = '#059669';
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          ctx.strokeRect(
            canvasCoords.x,
            canvasCoords.y,
            canvasCoords.width,
            canvasCoords.height
          );

          // Draw label
          ctx.fillStyle = '#059669';
          ctx.font = '12px sans-serif';
          ctx.fillText(`${i + 1}`, canvasCoords.x + 4, canvasCoords.y + 16);
        }
      }
    };

    drawExistingBoxes();

    // Draw current box being drawn
    if (currentBox && isDrawing) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        currentBox.x,
        currentBox.y,
        currentBox.width,
        currentBox.height
      );
    }
  }, [boundingBoxes, currentBox, isDrawing, convertPDFToCanvas]);

  const clearBoundingBoxes = useCallback(() => {
    setBoundingBoxes([]);
  }, []);

  const exportData = useCallback(() => {
    const data = {
      filename: pdfFile?.name || 'unknown.pdf',
      page: currentPage,
      boundingBoxes: boundingBoxes.map((box, index) => ({
        id: box.id,
        index: index + 1,
        pt: {
          x: Math.round(box.x * 100) / 100,
          y: Math.round(box.y * 100) / 100,
          width: Math.round(box.width * 100) / 100,
          height: Math.round(box.height * 100) / 100,
        },
        px: {
          x: Math.round((box.x / 0.75) * 100) / 100,
          y: Math.round((box.y / 0.75) * 100) / 100,
          width: Math.round((box.width / 0.75) * 100) / 100,
          height: Math.round((box.height / 0.75) * 100) / 100,
        },
        mm: {
          x: Math.round((box.x / 2.834645669) * 100) / 100,
          y: Math.round((box.y / 2.834645669) * 100) / 100,
          width: Math.round((box.width / 2.834645669) * 100) / 100,
          height: Math.round((box.height / 2.834645669) * 100) / 100,
        },
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pdfFile?.name || 'pdf'}-bboxes.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [boundingBoxes, pdfFile, currentPage]);

  return (
    <div className='min-h-screen bg-background p-6'>
      <div className='max-w-7xl mx-auto'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-foreground mb-2'>
            PDF Bounding Box Tool
          </h1>
          <p className='text-muted-foreground'>
            Upload a PDF, draw bounding boxes, and convert between units
          </p>
          <Button asChild>
            <Link href='/image-pdf'>Go to Image PDF Tool</Link>
          </Button>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
          {/* Upload Section */}
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
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className='w-8 h-8 mx-auto mb-2 text-muted-foreground' />
                <p className='text-sm text-muted-foreground'>
                  {pdfFile ? pdfFile.name : 'Drop PDF here or click to upload'}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type='file'
                accept='.pdf'
                onChange={handleFileUpload}
                className='hidden'
              />

              {/* Controls */}
              <div className='space-y-3'>
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

                {pdfLoaded && totalPages > 1 && (
                  <div className='space-y-2'>
                    <Label>
                      Page {currentPage} of {totalPages}
                    </Label>
                    <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1)
                          )
                        }
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}

                {/* Zoom Controls */}
                {pdfLoaded && (
                  <div className='space-y-2'>
                    <Label>Zoom: {Math.round(zoom * 100)}%</Label>
                    <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          setZoom((prev) => Math.max(prev - 0.25, 0.5))
                        }
                      >
                        <ZoomOut className='w-4 h-4' />
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          setZoom((prev) => Math.min(prev + 0.25, 3))
                        }
                      >
                        <ZoomIn className='w-4 h-4' />
                      </Button>
                    </div>
                  </div>
                )}

                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={clearBoundingBoxes}
                    disabled={boundingBoxes.length === 0}
                  >
                    <Trash2 className='w-4 h-4' />
                  </Button>
                  <Button
                    size='sm'
                    onClick={exportData}
                    disabled={boundingBoxes.length === 0}
                  >
                    <Download className='w-4 h-4 mr-2' />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PDF Viewer */}
          <Card className='lg:col-span-2'>
            <CardHeader>
              <CardTitle>PDF Viewer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='relative border border-border rounded-lg overflow-hidden bg-muted min-h-[600px]'>
                {pdfLoaded ? (
                  <div className='relative overflow-auto max-h-[600px]'>
                    <canvas
                      ref={canvasRef}
                      className='block max-w-full h-auto'
                    />
                    <canvas
                      ref={overlayCanvasRef}
                      className='absolute inset-0 cursor-crosshair'
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                    />
                  </div>
                ) : (
                  <div className='flex items-center justify-center h-[600px] text-muted-foreground'>
                    {pdfFile ? 'Loading PDF...' : 'Upload a PDF to get started'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bounding Boxes List */}
          <Card className='lg:col-span-1'>
            <CardHeader>
              <CardTitle>Bounding Boxes ({boundingBoxes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-3 max-h-[600px] overflow-y-auto'>
                {boundingBoxes.map((box, index) => {
                  const ptValues = {
                    x: Math.round(box.x * 100) / 100,
                    y: Math.round(box.y * 100) / 100,
                    width: Math.round(box.width * 100) / 100,
                    height: Math.round(box.height * 100) / 100,
                  };

                  const pxValues = {
                    x: Math.round((box.x / 0.75) * 100) / 100,
                    y: Math.round((box.y / 0.75) * 100) / 100,
                    width: Math.round((box.width / 0.75) * 100) / 100,
                    height: Math.round((box.height / 0.75) * 100) / 100,
                  };

                  const mmValues = {
                    x: Math.round((box.x / 2.834645669) * 100) / 100,
                    y: Math.round((box.y / 2.834645669) * 100) / 100,
                    width: Math.round((box.width / 2.834645669) * 100) / 100,
                    height: Math.round((box.height / 2.834645669) * 100) / 100,
                  };

                  return (
                    <div
                      key={box.id}
                      className='p-3 border border-border rounded-lg text-sm'
                    >
                      <div className='font-medium mb-2'>Box {index + 1}</div>

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
                    No bounding boxes yet. Draw on the PDF to create them.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
