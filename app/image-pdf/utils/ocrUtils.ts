import type { CoordinateConversion } from './coordinateConversion';

// Tesseract.js の型定義
interface TesseractBBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface TesseractWord {
  text: string;
  confidence: number;
  bbox: TesseractBBox;
}

interface TesseractLine {
  text: string;
  confidence: number;
  bbox: TesseractBBox;
}

interface TesseractParagraph {
  text: string;
  confidence: number;
  bbox: TesseractBBox;
}

interface TesseractBlock {
  text: string;
  confidence: number;
  bbox: TesseractBBox;
}

interface TesseractData {
  text: string;
  confidence: number;
  words?: TesseractWord[];
  lines?: TesseractLine[];
  paragraphs?: TesseractParagraph[];
  blocks?: TesseractBlock[];
}

export interface OCRResult {
  text: string;
  confidence: number;
  words: OCRWord[];
  lines: OCRLine[];
  paragraphs: OCRParagraph[];
  blocks: OCRBlock[];
}

export interface OCRWord {
  id: string;
  text: string;
  confidence: number;
  bbox: {
    original: { x0: number; y0: number; x1: number; y1: number };
    pt: CoordinateConversion['pt'] | null;
    px: CoordinateConversion['px'] | null;
    mm: CoordinateConversion['mm'] | null;
  };
}

export interface OCRLine {
  id: string;
  text: string;
  confidence: number;
  bbox: {
    original: { x0: number; y0: number; x1: number; y1: number };
    pt: CoordinateConversion['pt'] | null;
    px: CoordinateConversion['px'] | null;
    mm: CoordinateConversion['mm'] | null;
  };
}

export interface OCRParagraph {
  id: string;
  text: string;
  confidence: number;
  bbox: {
    original: { x0: number; y0: number; x1: number; y1: number };
    pt: CoordinateConversion['pt'] | null;
    px: CoordinateConversion['px'] | null;
    mm: CoordinateConversion['mm'] | null;
  };
}

export interface OCRBlock {
  id: string;
  text: string;
  confidence: number;
  bbox: {
    original: { x0: number; y0: number; x1: number; y1: number };
    pt: CoordinateConversion['pt'] | null;
    px: CoordinateConversion['px'] | null;
    mm: CoordinateConversion['mm'] | null;
  };
}

/**
 * Tesseract.jsの結果を構造化されたOCR結果に変換
 */
export const processOCRResult = (
  tesseractData: any,
  convertToPDFCoords: (
    x: number,
    y: number,
    width: number,
    height: number
  ) => CoordinateConversion | null
): OCRResult => {
  console.log('[DEBUG] Tesseract raw data:', tesseractData);

  const result: OCRResult = {
    text: tesseractData.text || '',
    confidence: tesseractData.confidence || 0,
    words: [],
    lines: [],
    paragraphs: [],
    blocks: [],
  };

  // 単語の処理
  if (tesseractData.words) {
    console.log('[DEBUG] Processing words:', tesseractData.words.length);
    result.words = tesseractData.words.map((word: any, index: number) => {
      // Tesseract.jsのbboxは { x0, y0, x1, y1 } 形式
      const bbox = word.bbox;
      console.log(`[DEBUG] Word ${index} bbox:`, bbox);

      // Tesseract.jsの座標は画像ピクセル座標
      const x0 = bbox?.x0 ?? 0;
      const y0 = bbox?.y0 ?? 0;
      const x1 = bbox?.x1 ?? 0;
      const y1 = bbox?.y1 ?? 0;

      const width = Math.max(1, x1 - x0);
      const height = Math.max(1, y1 - y0);

      console.log(`[DEBUG] Word ${index} coordinates:`, {
        x0,
        y0,
        x1,
        y1,
        width,
        height,
      });

      const coords = convertToPDFCoords(x0, y0, width, height);
      console.log(`[DEBUG] Word ${index} converted coords:`, coords);

      return {
        id: `ocr-word-${Date.now()}-${index}`,
        text: word.text || '',
        confidence: word.confidence || 0,
        bbox: {
          original: { x0, y0, x1, y1 },
          pt: coords ? coords.pt : null,
          px: coords ? coords.px : null,
          mm: coords ? coords.mm : null,
        },
      };
    });
  }

  // 行の処理
  if (tesseractData.lines) {
    console.log('[DEBUG] Processing lines:', tesseractData.lines.length);
    result.lines = tesseractData.lines.map((line: any, index: number) => {
      const bbox = line.bbox;
      console.log(`[DEBUG] Line ${index} bbox:`, bbox);

      const x0 = bbox?.x0 ?? 0;
      const y0 = bbox?.y0 ?? 0;
      const x1 = bbox?.x1 ?? 0;
      const y1 = bbox?.y1 ?? 0;

      const width = Math.max(1, x1 - x0);
      const height = Math.max(1, y1 - y0);
      const coords = convertToPDFCoords(x0, y0, width, height);

      return {
        id: `ocr-line-${Date.now()}-${index}`,
        text: line.text || '',
        confidence: line.confidence || 0,
        bbox: {
          original: { x0, y0, x1, y1 },
          pt: coords ? coords.pt : null,
          px: coords ? coords.px : null,
          mm: coords ? coords.mm : null,
        },
      };
    });
  }

  // 段落の処理
  if (tesseractData.paragraphs) {
    console.log(
      '[DEBUG] Processing paragraphs:',
      tesseractData.paragraphs.length
    );
    result.paragraphs = tesseractData.paragraphs.map(
      (paragraph: any, index: number) => {
        const bbox = paragraph.bbox;
        console.log(`[DEBUG] Paragraph ${index} bbox:`, bbox);

        const x0 = bbox?.x0 ?? 0;
        const y0 = bbox?.y0 ?? 0;
        const x1 = bbox?.x1 ?? 0;
        const y1 = bbox?.y1 ?? 0;

        const width = Math.max(1, x1 - x0);
        const height = Math.max(1, y1 - y0);
        const coords = convertToPDFCoords(x0, y0, width, height);

        return {
          id: `ocr-paragraph-${Date.now()}-${index}`,
          text: paragraph.text || '',
          confidence: paragraph.confidence || 0,
          bbox: {
            original: { x0, y0, x1, y1 },
            pt: coords ? coords.pt : null,
            px: coords ? coords.px : null,
            mm: coords ? coords.mm : null,
          },
        };
      }
    );
  }

  // ブロックの処理
  if (tesseractData.blocks) {
    console.log('[DEBUG] Processing blocks:', tesseractData.blocks.length);
    result.blocks = tesseractData.blocks.map((block: any, index: number) => {
      const bbox = block.bbox;
      console.log(`[DEBUG] Block ${index} bbox:`, bbox);

      const x0 = bbox?.x0 ?? 0;
      const y0 = bbox?.y0 ?? 0;
      const x1 = bbox?.x1 ?? 0;
      const y1 = bbox?.y1 ?? 0;

      const width = Math.max(1, x1 - x0);
      const height = Math.max(1, y1 - y0);
      const coords = convertToPDFCoords(x0, y0, width, height);

      return {
        id: `ocr-block-${Date.now()}-${index}`,
        text: block.text || '',
        confidence: block.confidence || 0,
        bbox: {
          original: { x0, y0, x1, y1 },
          pt: coords ? coords.pt : null,
          px: coords ? coords.px : null,
          mm: coords ? coords.mm : null,
        },
      };
    });
  }

  return result;
};

/**
 * OCRレベルに基づいてデータを取得
 */
export const getOCRDataByLevel = (
  data: OCRResult,
  level: 'word' | 'line' | 'paragraph' | 'block'
): (OCRWord | OCRLine | OCRParagraph | OCRBlock)[] => {
  switch (level) {
    case 'line':
      return data.lines ?? [];
    case 'paragraph':
      return data.paragraphs ?? [];
    case 'block':
      return data.blocks ?? [];
    case 'word':
    default:
      return data.words ?? [];
  }
};

/**
 * OCR言語設定の検証
 */
export const isValidOCRLanguage = (language: string): boolean => {
  const validLanguages = ['eng', 'jpn', 'eng+jpn'];
  return validLanguages.includes(language);
};

/**
 * OCR信頼度に基づいてフィルタリング
 */
export const filterOCRResultsByConfidence = (
  items: (OCRWord | OCRLine | OCRParagraph | OCRBlock)[],
  minConfidence: number
): (OCRWord | OCRLine | OCRParagraph | OCRBlock)[] => {
  return items.filter((item: OCRWord | OCRLine | OCRParagraph | OCRBlock) => {
    const confidence =
      typeof item.confidence === 'number' ? item.confidence : 0;
    return confidence >= minConfidence;
  });
};
