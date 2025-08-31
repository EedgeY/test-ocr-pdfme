import { useState, useCallback, useEffect } from 'react';
import type { PDFDocumentInfo, Point, BoundingBox } from '../utils/types';
import {
  displayToImageCoords,
  imageCoordsToPDFPoints,
  pdfPointsToDisplayCoords,
} from '../utils/coordinateConversion';

export const usePDF = () => {
  const [pdfInfo, setPdfInfo] = useState<PDFDocumentInfo>({
    file: null,
    document: null,
    currentPage: 1,
    totalPages: 0,
    imageDataUrl: null,
    originalDimensions: null,
    isLoaded: false,
  });

  const [isConverting, setIsConverting] = useState(false);

  // PDFファイルを読み込む
  const loadPDFFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') return;

    setPdfInfo((prev) => ({
      ...prev,
      file,
      isLoaded: false,
      imageDataUrl: null,
    }));

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer })
        .promise;

      setPdfInfo((prev) => ({
        ...prev,
        document: pdf,
        totalPages: pdf.numPages,
        currentPage: 1,
        isLoaded: true,
      }));

      console.log('[v0] PDF loaded with', pdf.numPages, 'pages');
    } catch (error) {
      console.error('[v0] Error loading PDF:', error);
    }
  }, []);

  // PDFページを画像に変換
  const convertPageToImage = useCallback(
    async (pageNum: number) => {
      if (!pdfInfo.document) return;

      if (pageNum < 1 || pageNum > pdfInfo.totalPages) {
        console.error(
          '[v0] Invalid page number:',
          pageNum,
          'Total pages:',
          pdfInfo.totalPages
        );
        return;
      }

      setIsConverting(true);

      try {
        const page = await pdfInfo.document.getPage(pageNum);
        const scale = 300 / 72;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas context not available');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        const dataUrl = canvas.toDataURL('image/png', 1.0);

        // Get original PDF size for reference
        const originalViewport = page.getViewport({ scale: 1 });

        setPdfInfo((prev) => ({
          ...prev,
          currentPage: pageNum,
          imageDataUrl: dataUrl,
          originalDimensions: {
            width: viewport.width,
            height: viewport.height,
          },
        }));

        console.log('[v0] PDF dimensions:', {
          original72DPI: {
            width: originalViewport.width,
            height: originalViewport.height,
          },
          scaled300DPI: { width: viewport.width, height: viewport.height },
          scale: 300 / 72,
        });

        console.log('[v0] PDF converted to 300 DPI image successfully');
      } catch (error) {
        console.error('[v0] Error converting PDF to image:', error);
      } finally {
        setIsConverting(false);
      }
    },
    [pdfInfo.document, pdfInfo.totalPages]
  );

  // ページを変更
  const changePage = useCallback(
    (pageNum: number) => {
      if (pageNum >= 1 && pageNum <= pdfInfo.totalPages) {
        setPdfInfo((prev) => ({ ...prev, currentPage: pageNum }));
      }
    },
    [pdfInfo.totalPages]
  );

  // ディスプレイ座標をPDF座標に変換
  const convertDisplayToPDF = useCallback(
    (
      displayX: number,
      displayY: number,
      displayWidth: number,
      displayHeight: number,
      imageElement?: HTMLImageElement
    ) => {
      if (!pdfInfo.originalDimensions) return null;

      // Use provided image element or try to find one
      const imgElement =
        imageElement ||
        (document.querySelector('#pdf-image') as HTMLImageElement);

      if (!imgElement) {
        console.warn('[v0] convertDisplayToPDF: No image element found');
        return null;
      }

      const imageCoords = displayToImageCoords(
        displayX,
        displayY,
        displayWidth,
        displayHeight,
        pdfInfo.originalDimensions,
        imgElement
      );

      if (!imageCoords) return null;

      return imageCoordsToPDFPoints(
        imageCoords.x,
        imageCoords.y,
        imageCoords.width,
        imageCoords.height
      );
    },
    [pdfInfo.originalDimensions]
  );

  // PDF座標をディスプレイ座標に変換
  const convertPDFToDisplay = useCallback(
    (pdfX: number, pdfY: number, pdfWidth: number, pdfHeight: number) => {
      if (!pdfInfo.originalDimensions) return null;

      return pdfPointsToDisplayCoords(
        pdfX,
        pdfY,
        pdfWidth,
        pdfHeight,
        pdfInfo.originalDimensions,
        document.querySelector('img') as HTMLImageElement
      );
    },
    [pdfInfo.originalDimensions]
  );

  // ドロップされたファイルを処理
  const handleFileDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file && file.type === 'application/pdf') {
        console.log('[v0] PDF file dropped:', file.name);
        await loadPDFFile(file);
      }
    },
    [loadPDFFile]
  );

  // ファイル入力の変更を処理
  const handleFileInput = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type === 'application/pdf') {
        console.log('[v0] PDF file selected:', file.name);
        await loadPDFFile(file);
      }
    },
    [loadPDFFile]
  );

  // PDF.jsを初期化
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

  // PDFが読み込まれたら最初のページを変換
  useEffect(() => {
    if (pdfInfo.document && pdfInfo.isLoaded) {
      convertPageToImage(pdfInfo.currentPage);
    }
  }, [
    pdfInfo.document,
    pdfInfo.currentPage,
    pdfInfo.isLoaded,
    convertPageToImage,
  ]);

  return {
    pdfInfo,
    isConverting,
    loadPDFFile,
    convertPageToImage,
    changePage,
    convertDisplayToPDF,
    convertPDFToDisplay,
    imageCoordsToPDFPoints,
    handleFileDrop,
    handleFileInput,
  };
};
