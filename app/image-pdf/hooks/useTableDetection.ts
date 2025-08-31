import { useState, useCallback, useEffect } from 'react';
import type { TableDetectionMode, BoundingBox } from '../utils/types';
import { imageCoordsToPDFPoints } from '../utils/coordinateConversion';
import {
  detectHorizontalLines,
  detectVerticalLines,
  filterLines,
  detectTableRegions,
  createCellsFromLines,
  convertTableRegionToBoundingBox,
  convertTableCellToBoundingBox,
  convertTableLineToBoundingBox,
} from '../utils/tableDetectionUtils';

export const useTableDetection = (
  imageDataUrl: string | null,
  convertDisplayToPDF: (
    x: number,
    y: number,
    width: number,
    height: number,
    imageElement?: HTMLImageElement
  ) => any,
  selectedUnit: 'px' | 'mm' | 'pt'
) => {
  const [mode, setMode] = useState<TableDetectionMode>('table');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cvLoaded, setCvLoaded] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);
  const [cvLoadingProgress, setCvLoadingProgress] = useState<number>(0);

  // OpenCVを初期化
  useEffect(() => {
    const cvSources = [
      'https://docs.opencv.org/4.x/opencv.js',
      'https://cdn.jsdelivr.net/npm/opencv.js@4.8.0/opencv.js',
      'https://unpkg.com/opencv.js@4.8.0/opencv.js',
    ];

    let currentSourceIndex = 0;
    const loadStartTime = Date.now();

    const loadCvScript = (sourceIndex: number) => {
      if (sourceIndex >= cvSources.length) {
        setCvError('全てのCDNからOpenCV.jsの読み込みに失敗しました');
        console.error('[v0] All OpenCV.js CDN sources failed');
        return;
      }

      const source = cvSources[sourceIndex];
      console.log(`[v0] Trying OpenCV.js from: ${source}`);

      const cvScript = document.createElement('script');
      cvScript.src = source;
      cvScript.async = true;

      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - loadStartTime;
        const simulatedProgress = Math.min(90, (elapsed / 30000) * 100);
        setCvLoadingProgress(simulatedProgress);
      }, 500);

      cvScript.onload = () => {
        clearInterval(progressInterval);
        console.log(
          `[v0] OpenCV.js loaded from ${source} in ${
            Date.now() - loadStartTime
          }ms`
        );

        if (window.cv) {
          setCvLoadingProgress(95);
          window.cv['onRuntimeInitialized'] = () => {
            setCvLoaded(true);
            setCvError(null);
            setCvLoadingProgress(100);
            console.log('[v0] OpenCV.js loaded and initialized successfully');
          };

          setTimeout(() => {
            if (!cvLoaded) {
              console.warn(
                '[v0] OpenCV.js loaded but initialization timeout - trying manual init'
              );
              setCvLoaded(true);
              setCvError(null);
              setCvLoadingProgress(100);
            }
          }, 20000);
        } else {
          console.error(
            `[v0] OpenCV.js loaded from ${source} but window.cv is undefined`
          );
          currentSourceIndex++;
          loadCvScript(currentSourceIndex);
        }
      };

      cvScript.onerror = (e) => {
        clearInterval(progressInterval);
        console.error(`[v0] Failed to load OpenCV.js from ${source}:`, e);
        currentSourceIndex++;
        loadCvScript(currentSourceIndex);
      };

      document.head.appendChild(cvScript);
    };

    loadCvScript(0);
  }, [cvLoaded]);

  // OpenCVを使用した表検出
  const detectTablesWithOpenCV = useCallback(async (): Promise<
    BoundingBox[]
  > => {
    if (!imageDataUrl)
      throw new Error('No image available for table detection');

    const img = document.querySelector('img') as HTMLImageElement;
    if (!img || !img.complete || img.naturalWidth === 0) {
      throw new Error('Image not fully loaded');
    }

    console.log('[v0] Initializing OpenCV operations...');
    const cv = window.cv;

    const src = cv.imread(img);
    console.log('[v0] Image dimensions:', src.rows, 'x', src.cols);

    if (src.rows === 0 || src.cols === 0) {
      throw new Error('Invalid image dimensions');
    }

    const gray = new cv.Mat();
    const bin = new cv.Mat();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    console.log('[v0] Converted to grayscale');

    cv.adaptiveThreshold(
      gray,
      bin,
      255,
      cv.ADAPTIVE_THRESH_MEAN_C,
      cv.THRESH_BINARY_INV,
      15,
      10
    );
    console.log('[v0] Applied adaptive threshold');

    const tableBoxes: BoundingBox[] = [];

    if (mode === 'table') {
      console.log('[v0] Using table region detection mode');

      const horizontal = new cv.Mat();
      const vertical = new cv.Mat();

      const kernelH = cv.getStructuringElement(
        cv.MORPH_RECT,
        new cv.Size(Math.max(25, Math.floor(src.cols / 15)), 1)
      );
      const kernelV = cv.getStructuringElement(
        cv.MORPH_RECT,
        new cv.Size(1, Math.max(25, Math.floor(src.rows / 15)))
      );

      cv.erode(bin, horizontal, kernelH);
      cv.dilate(horizontal, horizontal, kernelH);
      cv.erode(bin, vertical, kernelV);
      cv.dilate(vertical, vertical, kernelV);

      const mask = new cv.Mat();
      cv.bitwise_or(horizontal, vertical, mask);

      const kernelClean = cv.getStructuringElement(
        cv.MORPH_RECT,
        new cv.Size(5, 5)
      );
      cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, kernelClean);
      cv.morphologyEx(mask, mask, cv.MORPH_OPEN, kernelClean);

      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(
        mask,
        contours,
        hierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
      );

      console.log('[v0] Found', contours.size(), 'contours in table detection');

      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const rect = cv.boundingRect(cnt);

        const minWidth = Math.max(100, src.cols * 0.1);
        const minHeight = Math.max(50, src.rows * 0.05);

        if (
          rect.width >= minWidth &&
          rect.height >= minHeight &&
          rect.width <= src.cols * 0.95 &&
          rect.height <= src.rows * 0.95
        ) {
          console.log('[DEBUG] Table region detected:', rect);
          // 画像座標を直接PDFポイントに変換
          const coords = imageCoordsToPDFPoints(
            rect.x,
            rect.y,
            rect.width,
            rect.height
          );
          console.log('[DEBUG] Table region converted coords:', coords);

          tableBoxes.push({
            id: `table-region-${Date.now()}-${i}`,
            x: coords.pt.x,
            y: coords.pt.y,
            width: coords.pt.width,
            height: coords.pt.height,
            unit: 'pt', // Always store in PDF points
            kind: 'table',
          });
        }
        cnt.delete();
      }

      // cleanup
      horizontal.delete();
      vertical.delete();
      mask.delete();
      contours.delete();
      hierarchy.delete();
      kernelH.delete();
      kernelV.delete();
      kernelClean.delete();
    } else if (mode === 'lines') {
      const horizontal = new cv.Mat();
      const vertical = new cv.Mat();

      const kernelH = cv.getStructuringElement(
        cv.MORPH_RECT,
        new cv.Size(Math.max(15, Math.floor(src.cols / 12)), 1)
      );
      cv.erode(bin, horizontal, kernelH);
      cv.dilate(horizontal, horizontal, kernelH);

      const kernelV = cv.getStructuringElement(
        cv.MORPH_RECT,
        new cv.Size(1, Math.max(15, Math.floor(src.rows / 12)))
      );
      cv.erode(bin, vertical, kernelV);
      cv.dilate(vertical, vertical, kernelV);

      const hContours = new cv.MatVector();
      const hHierarchy = new cv.Mat();
      cv.findContours(
        horizontal,
        hContours,
        hHierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
      );

      const vContours = new cv.MatVector();
      const vHierarchy = new cv.Mat();
      cv.findContours(
        vertical,
        vContours,
        vHierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
      );

      // Process horizontal lines
      for (let i = 0; i < hContours.size(); i++) {
        const cnt = hContours.get(i);
        const rect = cv.boundingRect(cnt);
        if (rect.width > src.cols * 0.1 || rect.width * rect.height > 1000) {
          console.log('[DEBUG] Horizontal line detected:', rect);
          const coords = imageCoordsToPDFPoints(
            rect.x,
            rect.y,
            rect.width,
            Math.max(1, rect.height)
          );
          console.log('[DEBUG] Horizontal line converted coords:', coords);

          tableBoxes.push({
            id: `hline-${Date.now()}-${i}`,
            x: coords.pt.x,
            y: coords.pt.y,
            width: coords.pt.width,
            height: coords.pt.height,
            unit: 'pt', // Always store in PDF points
            kind: 'table',
          });
        }
        cnt.delete();
      }

      // Process vertical lines
      for (let i = 0; i < vContours.size(); i++) {
        const cnt = vContours.get(i);
        const rect = cv.boundingRect(cnt);
        if (rect.height > src.rows * 0.1 || rect.width * rect.height > 1000) {
          console.log('[DEBUG] Vertical line detected:', rect);
          const coords = imageCoordsToPDFPoints(
            rect.x,
            rect.y,
            Math.max(1, rect.width),
            rect.height
          );
          console.log('[DEBUG] Vertical line converted coords:', coords);

          tableBoxes.push({
            id: `vline-${Date.now()}-${i}`,
            x: coords.pt.x,
            y: coords.pt.y,
            width: coords.pt.width,
            height: coords.pt.height,
            unit: 'pt', // Always store in PDF points
            kind: 'table',
          });
        }
        cnt.delete();
      }

      // cleanup
      horizontal.delete();
      vertical.delete();
      hContours.delete();
      hHierarchy.delete();
      vContours.delete();
      vHierarchy.delete();
      kernelH.delete();
      kernelV.delete();
    } else if (mode === 'cells') {
      const horizontal = new cv.Mat();
      const vertical = new cv.Mat();

      const kernelH = cv.getStructuringElement(
        cv.MORPH_RECT,
        new cv.Size(Math.max(15, Math.floor(src.cols / 12)), 1)
      );
      cv.erode(bin, horizontal, kernelH);
      cv.dilate(horizontal, horizontal, kernelH);

      const kernelV = cv.getStructuringElement(
        cv.MORPH_RECT,
        new cv.Size(1, Math.max(15, Math.floor(src.rows / 12)))
      );
      cv.erode(bin, vertical, kernelV);
      cv.dilate(vertical, vertical, kernelV);

      const mask = new cv.Mat();
      cv.bitwise_and(horizontal, vertical, mask);

      const kernelDilate = cv.getStructuringElement(
        cv.MORPH_RECT,
        new cv.Size(3, 3)
      );
      cv.dilate(mask, mask, kernelDilate);

      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(
        mask,
        contours,
        hierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
      );

      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const rect = cv.boundingRect(cnt);

        if (
          rect.width > 15 &&
          rect.height > 15 &&
          rect.width < src.cols * 0.5 &&
          rect.height < src.rows * 0.5
        ) {
          console.log('[DEBUG] Cell detected:', rect);
          const coords = imageCoordsToPDFPoints(
            rect.x,
            rect.y,
            rect.width,
            rect.height
          );
          console.log('[DEBUG] Cell converted coords:', coords);

          tableBoxes.push({
            id: `cell-contour-${Date.now()}-${i}`,
            x: coords.pt.x,
            y: coords.pt.y,
            width: coords.pt.width,
            height: coords.pt.height,
            unit: 'pt', // Always store in PDF points
            kind: 'table',
          });
        }
        cnt.delete();
      }

      // cleanup
      horizontal.delete();
      vertical.delete();
      mask.delete();
      contours.delete();
      hierarchy.delete();
      kernelH.delete();
      kernelV.delete();
      kernelDilate.delete();
    }

    // Common cleanup
    src.delete();
    gray.delete();
    bin.delete();

    return tableBoxes;
  }, [imageDataUrl, mode, selectedUnit]);

  // フォールバック表検出（OpenCVなし）
  const detectTablesFallback = useCallback(async (): Promise<BoundingBox[]> => {
    if (!imageDataUrl)
      throw new Error('No image available for table detection');

    const img = document.querySelector('img') as HTMLImageElement;
    if (!img) throw new Error('Image element not found');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    console.log(`[v0] Processing image: ${canvas.width}x${canvas.height}`);

    const horizontalLines = detectHorizontalLines(
      data,
      canvas.width,
      canvas.height
    );
    const verticalLines = detectVerticalLines(
      data,
      canvas.width,
      canvas.height
    );

    console.log(`[v0] Detected ${horizontalLines.length} horizontal lines`);
    console.log(`[v0] Detected ${verticalLines.length} vertical lines`);

    const tableBoxes: BoundingBox[] = [];

    if (horizontalLines.length >= 2 && verticalLines.length >= 2) {
      const filteredHLines = filterLines(horizontalLines, canvas.height);
      const filteredVLines = filterLines(verticalLines, canvas.width);

      console.log(
        `[v0] Filtered to ${filteredHLines.length} horizontal, ${filteredVLines.length} vertical lines`
      );

      if (mode === 'cells') {
        const cells = createCellsFromLines(
          filteredHLines,
          filteredVLines,
          canvas.width,
          canvas.height
        );

        cells.forEach((cell) => {
          console.log('[DEBUG] Fallback cell detected:', cell);
          const coords = imageCoordsToPDFPoints(
            cell.x,
            cell.y,
            cell.width,
            cell.height
          );
          console.log('[DEBUG] Fallback cell converted coords:', coords);

          tableBoxes.push({
            id: `cell-${Date.now()}-${cell.row}-${cell.col}`,
            x: coords.pt.x,
            y: coords.pt.y,
            width: coords.pt.width,
            height: coords.pt.height,
            unit: 'pt',
            kind: 'table',
          });
        });
      }
    }

    if (mode === 'table' || tableBoxes.length === 0) {
      const tableRegions = detectTableRegions(
        data,
        canvas.width,
        canvas.height
      );
      tableRegions.forEach((region, index) => {
        console.log('[DEBUG] Fallback table region detected:', region);
        const coords = imageCoordsToPDFPoints(
          region.x,
          region.y,
          region.width,
          region.height
        );
        console.log('[DEBUG] Fallback table region converted coords:', coords);

        tableBoxes.push({
          id: `table-region-${Date.now()}-${index}`,
          x: coords.pt.x,
          y: coords.pt.y,
          width: coords.pt.width,
          height: coords.pt.height,
          unit: 'pt',
          kind: 'table',
        });
      });
    }

    return tableBoxes;
  }, [imageDataUrl, mode, selectedUnit]);

  // 表検出を実行
  const detectTables = useCallback(async (): Promise<BoundingBox[]> => {
    console.log('[v0] Starting table detection...');
    console.log('[v0] cvLoaded:', cvLoaded, 'cvError:', cvError);

    setIsProcessing(true);

    try {
      if (!cvLoaded || cvError || !window.cv) {
        console.log('[v0] OpenCV not available, using fallback method');
        return await detectTablesFallback();
      } else {
        return await detectTablesWithOpenCV();
      }
    } catch (error: unknown) {
      console.error('[v0] Table detection failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      setCvError(`表検出エラー: ${errorMessage}`);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [cvLoaded, cvError, detectTablesWithOpenCV, detectTablesFallback]);

  return {
    mode,
    setMode,
    isProcessing,
    cvLoaded,
    cvError,
    cvLoadingProgress,
    detectTables,
  };
};
