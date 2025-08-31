import type {
  BoundingBox,
  ExportData,
  OCRTextData,
  PDFDocumentInfo,
} from '../utils/types';
import { convertToUnits } from '../utils/coordinateConversion';

export const exportBoundingBoxes = (
  boundingBoxes: BoundingBox[],
  pdfInfo: PDFDocumentInfo,
  ocrSettings: {
    language: string;
    level: string;
    minConfidence: number;
    enhanceImage: boolean;
  }
): void => {
  const data: ExportData = {
    filename: pdfInfo.file?.name || 'unknown.pdf',
    page: pdfInfo.currentPage,
    dpi: 300,
    timestamp: new Date().toISOString(),
    metadata: {
      ocrLanguage: ocrSettings.language,
      ocrLevel: ocrSettings.level,
      ocrMinConfidence: ocrSettings.minConfidence,
      ocrEnhanceImage: ocrSettings.enhanceImage,
      totalBoundingBoxes: boundingBoxes.length,
    },
    boundingBoxes: boundingBoxes.map((box, index) => ({
      id: box.id,
      index: index + 1,
      kind: box.kind,
      pt: {
        x: convertToUnits(box.x, box.unit, 'pt'),
        y: convertToUnits(box.y, box.unit, 'pt'),
        width: convertToUnits(box.width, box.unit, 'pt'),
        height: convertToUnits(box.height, box.unit, 'pt'),
      },
      px: {
        x: convertToUnits(box.x, box.unit, 'px'),
        y: convertToUnits(box.y, box.unit, 'px'),
        width: convertToUnits(box.width, box.unit, 'px'),
        height: convertToUnits(box.height, box.unit, 'px'),
      },
      mm: {
        x: convertToUnits(box.x, box.unit, 'mm'),
        y: convertToUnits(box.y, box.unit, 'mm'),
        width: convertToUnits(box.width, box.unit, 'mm'),
        height: convertToUnits(box.height, box.unit, 'mm'),
      },
    })),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${pdfInfo.file?.name || 'pdf'}-bboxes-${
    pdfInfo.currentPage
  }.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportOCRTextData = (
  ocrTextData: OCRTextData | null,
  pdfInfo: PDFDocumentInfo,
  ocrSettings: {
    language: string;
    level: string;
    minConfidence: number;
    enhanceImage: boolean;
  }
): void => {
  if (!ocrTextData) {
    alert(
      'OCRが実行されていないか、文字データがありません。まずOCRを実行してください。'
    );
    return;
  }

  const data = {
    filename: pdfInfo.file?.name || 'unknown.pdf',
    page: pdfInfo.currentPage,
    dpi: 300,
    timestamp: new Date().toISOString(),
    ocrSettings,
    ocrResults: ocrTextData,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${pdfInfo.file?.name || 'pdf'}-ocr-text-${
    pdfInfo.currentPage
  }.json`;
  a.click();
  URL.revokeObjectURL(url);
};
