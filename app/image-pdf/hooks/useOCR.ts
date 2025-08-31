import { useState, useCallback, useEffect } from 'react';
import type { OCRSettings, OCRTextData, BoundingBox } from '../utils/types';
import { preprocessImageWithOpenCV } from '../utils/imagePreprocessing';
import {
  processOCRResult,
  getOCRDataByLevel,
  filterOCRResultsByConfidence,
} from '../utils/ocrUtils';

export const useOCR = (
  imageDataUrl: string | null,
  convertDisplayToPDF: (
    x: number,
    y: number,
    width: number,
    height: number
  ) => any,
  imageCoordsToPDFPoints: (
    x: number,
    y: number,
    width: number,
    height: number
  ) => any
) => {
  const [settings, setSettings] = useState<OCRSettings>({
    language: 'eng',
    level: 'word',
    minConfidence: 60,
    enhanceImage: true,
  });

  const [textData, setTextData] = useState<OCRTextData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // OCRを実行
  const performOCR = useCallback(async () => {
    if (!imageDataUrl || !window.Tesseract) {
      console.error('[v0] OCR not available - missing image or Tesseract');
      return;
    }

    setIsProcessing(true);
    console.log('[v0] Starting OCR processing with enhanced settings...');

    try {
      // 画像前処理
      console.log('[v0] Preprocessing image for OCR...');
      const processedImageUrl = await preprocessImageWithOpenCV(
        imageDataUrl,
        settings.enhanceImage
      );

      // OCR実行
      const result = await window.Tesseract.recognize(
        processedImageUrl,
        settings.language,
        {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              console.log(
                `[v0] OCR Progress: ${Math.round(m.progress * 100)}%`
              );
            }
          },
        }
      );

      // OCR結果の処理
      console.log('[v0] OCR completed, processing results...');
      console.log('[DEBUG] Raw Tesseract result:', result);
      console.log('[DEBUG] Tesseract result.data:', result.data);

      const processedData = processOCRResult(
        result.data,
        (x, y, width, height) => imageCoordsToPDFPoints(x, y, width, height)
      );

      setTextData(processedData);
      console.log(
        '[v0] OCR text data saved with',
        processedData.words.length,
        'words'
      );
    } catch (error: unknown) {
      console.error('[v0] OCR processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [imageDataUrl, settings, convertDisplayToPDF, imageCoordsToPDFPoints]);

  // OCR結果から境界ボックスを生成
  const generateBoundingBoxes = useCallback(
    (unit: 'px' | 'mm' | 'pt'): BoundingBox[] => {
      if (!textData) return [];

      const boxes: BoundingBox[] = [];
      const items = getOCRDataByLevel(textData, settings.level);
      const filteredItems = filterOCRResultsByConfidence(
        items,
        settings.minConfidence
      );

      filteredItems.forEach((item: any, index: number) => {
        console.log(`[DEBUG] Processing OCR item ${index}:`, item);

        const bbox = item.bbox;
        if (!bbox) {
          console.warn(`[DEBUG] No bbox found for item ${index}`);
          return;
        }

        // OCRUtilsで処理済みのデータから座標を取得
        const coords = bbox.pt;
        if (coords && coords.x !== 0 && coords.y !== 0) {
          console.log(`[DEBUG] Adding OCR box ${index}:`, coords);
          boxes.push({
            id: `ocr-${settings.level}-bbox-${Date.now()}-${index}`,
            x: coords.x,
            y: coords.y,
            width: coords.width,
            height: coords.height,
            unit: 'pt', // Always store in PDF points
            kind: 'ocr',
          });
        } else {
          console.warn(
            `[DEBUG] Invalid coordinates for item ${index}:`,
            coords
          );
        }
      });

      return boxes;
    },
    [textData, settings, imageCoordsToPDFPoints]
  );

  // 設定を更新
  const updateSettings = useCallback((newSettings: Partial<OCRSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // OCR結果をエクスポート
  const exportOCRData = useCallback(() => {
    if (!textData) {
      alert(
        'OCRが実行されていないか、文字データがありません。まずOCRを実行してください。'
      );
      return null;
    }

    return {
      filename: 'ocr-result.json',
      timestamp: new Date().toISOString(),
      ocrSettings: settings,
      ocrResults: textData,
    };
  }, [textData, settings]);

  // Tesseract.jsを初期化
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/tesseract.js@v5.0.0/dist/tesseract.min.js';
    script.onload = () => {
      console.log('[v0] Tesseract.js loaded successfully');
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return {
    settings,
    textData,
    isProcessing,
    performOCR,
    generateBoundingBoxes,
    updateSettings,
    exportOCRData,
  };
};
