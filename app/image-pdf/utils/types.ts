import type { CoordinateConversion } from './coordinateConversion';

export type Unit = 'px' | 'mm' | 'pt';

export type OCRLevel = 'word' | 'line' | 'paragraph' | 'block';

export type OCRLanguage = 'eng' | 'jpn' | 'eng+jpn';

export type TableDetectionMode = 'table' | 'cells' | 'lines';

export type BoundingBoxKind = 'manual' | 'ocr' | 'table';

export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  unit: Unit;
  kind?: BoundingBoxKind;
}

export interface Point {
  x: number;
  y: number;
}

export interface PDFDocumentInfo {
  file: File | null;
  document: any;
  currentPage: number;
  totalPages: number;
  imageDataUrl: string | null;
  originalDimensions: {
    width: number;
    height: number;
  } | null;
  isLoaded: boolean;
}

export interface OCRSettings {
  language: OCRLanguage;
  level: OCRLevel;
  minConfidence: number;
  enhanceImage: boolean;
}

export interface OCRTextData {
  text: string;
  confidence: number;
  words: Array<{
    id: string;
    text: string;
    confidence: number;
    bbox: {
      original: { x0: number; y0: number; x1: number; y1: number };
      pt: CoordinateConversion['pt'] | null;
      px: CoordinateConversion['px'] | null;
      mm: CoordinateConversion['mm'] | null;
    };
  }>;
  lines: Array<{
    id: string;
    text: string;
    confidence: number;
    bbox: {
      original: { x0: number; y0: number; x1: number; y1: number };
      pt: CoordinateConversion['pt'] | null;
      px: CoordinateConversion['px'] | null;
      mm: CoordinateConversion['mm'] | null;
    };
  }>;
  paragraphs: Array<{
    id: string;
    text: string;
    confidence: number;
    bbox: {
      original: { x0: number; y0: number; x1: number; y1: number };
      pt: CoordinateConversion['pt'] | null;
      px: CoordinateConversion['px'] | null;
      mm: CoordinateConversion['mm'] | null;
    };
  }>;
  blocks: Array<{
    id: string;
    text: string;
    confidence: number;
    bbox: {
      original: { x0: number; y0: number; x1: number; y1: number };
      pt: CoordinateConversion['pt'] | null;
      px: CoordinateConversion['px'] | null;
      mm: CoordinateConversion['mm'] | null;
    };
  }>;
}

export interface ExportData {
  filename: string;
  page: number;
  dpi: number;
  timestamp: string;
  metadata: {
    ocrLanguage: OCRLanguage;
    ocrLevel: OCRLevel;
    ocrMinConfidence: number;
    ocrEnhanceImage: boolean;
    totalBoundingBoxes: number;
  };
  boundingBoxes: Array<{
    id: string;
    index: number;
    kind?: BoundingBoxKind;
    pt: CoordinateConversion['pt'];
    px: CoordinateConversion['px'];
    mm: CoordinateConversion['mm'];
  }>;
}

// Global type declarations for external libraries
declare global {
  interface Window {
    pdfjsLib: any;
    Tesseract: any;
    cv: any;
  }
}
