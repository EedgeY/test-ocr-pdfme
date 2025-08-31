export interface CoordinateConversion {
  pt: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  px: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  mm: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Dimensions {
  width: number;
  height: number;
}

/**
 * PDFポイントをピクセルに変換（96 DPI基準）
 */
export const pointsToPixels = (points: number): number => {
  return ((points / 0.75) * 100) / 100;
};

/**
 * PDFポイントをミリメートルに変換
 */
export const pointsToMillimeters = (points: number): number => {
  return ((points / 2.834645669) * 100) / 100;
};

/**
 * ピクセルをPDFポイントに変換
 */
export const pixelsToPoints = (pixels: number): number => {
  return pixels * 0.75;
};

/**
 * ミリメートルをPDFポイントに変換
 */
export const millimetersToPoints = (millimeters: number): number => {
  return millimeters * 2.834645669;
};

/**
 * 画像座標（300 DPI）をPDFポイントに変換
 */
export const imageCoordsToPDFPoints = (
  imageX: number,
  imageY: number,
  imageWidth: number,
  imageHeight: number
): CoordinateConversion => {
  console.log('[DEBUG] imageCoordsToPDFPoints input:', {
    imageX,
    imageY,
    imageWidth,
    imageHeight,
  });

  const dpiScale = 300 / 72;
  const pdfX = imageX / dpiScale;
  const pdfY = imageY / dpiScale;
  const pdfWidth = imageWidth / dpiScale;
  const pdfHeight = imageHeight / dpiScale;

  console.log('[DEBUG] imageCoordsToPDFPoints conversion:', {
    dpiScale,
    pdfCoords: { pdfX, pdfY, pdfWidth, pdfHeight },
  });

  const result = {
    pt: {
      x: Math.round(pdfX * 100) / 100,
      y: Math.round(pdfY * 100) / 100,
      width: Math.round(pdfWidth * 100) / 100,
      height: Math.round(pdfHeight * 100) / 100,
    },
    px: {
      x: Math.round(pointsToPixels(pdfX) * 100) / 100,
      y: Math.round(pointsToPixels(pdfY) * 100) / 100,
      width: Math.round(pointsToPixels(pdfWidth) * 100) / 100,
      height: Math.round(pointsToPixels(pdfHeight) * 100) / 100,
    },
    mm: {
      x: Math.round(pointsToMillimeters(pdfX) * 100) / 100,
      y: Math.round(pointsToMillimeters(pdfY) * 100) / 100,
      width: Math.round(pointsToMillimeters(pdfWidth) * 100) / 100,
      height: Math.round(pointsToMillimeters(pdfHeight) * 100) / 100,
    },
  };

  console.log('[DEBUG] imageCoordsToPDFPoints result:', result);
  return result;
};

/**
 * ディスプレイ座標を画像座標に変換
 */
export const displayToImageCoords = (
  displayX: number,
  displayY: number,
  displayWidth: number,
  displayHeight: number,
  originalDimensions: Dimensions | null,
  imageElement: HTMLImageElement | null
): { x: number; y: number; width: number; height: number } | null => {
  if (!originalDimensions || !imageElement) return null;

  const displayImageWidth = imageElement.clientWidth;
  const displayImageHeight = imageElement.clientHeight;

  // Calculate scale: how many image pixels per display pixel
  const scaleX = originalDimensions.width / displayImageWidth;
  const scaleY = originalDimensions.height / displayImageHeight;

  console.log('[v0] displayToImageCoords:', {
    display: { x: displayX, y: displayY, w: displayWidth, h: displayHeight },
    image: {
      width: originalDimensions.width,
      height: originalDimensions.height,
    },
    displayImage: { width: displayImageWidth, height: displayImageHeight },
    scale: { x: scaleX, y: scaleY },
    result: {
      x: displayX * scaleX,
      y: displayY * scaleY,
      width: displayWidth * scaleX,
      height: displayHeight * scaleY,
    },
  });

  return {
    x: displayX * scaleX,
    y: displayY * scaleY,
    width: displayWidth * scaleX,
    height: displayHeight * scaleY,
  };
};

/**
 * PDFポイントをディスプレイ座標に変換
 */
export const pdfPointsToDisplayCoords = (
  pdfX: number,
  pdfY: number,
  pdfWidth: number,
  pdfHeight: number,
  originalDimensions: Dimensions | null,
  imageElement: HTMLImageElement | null
): { x: number; y: number; width: number; height: number } | null => {
  if (!originalDimensions || !imageElement) return null;

  const displayImageWidth = imageElement.clientWidth;
  const displayImageHeight = imageElement.clientHeight;

  // PDFポイントを300 DPI画像座標に変換
  const dpiScale = 300 / 72;
  const imageX = pdfX * dpiScale;
  const imageY = pdfY * dpiScale;
  const imageWidth = pdfWidth * dpiScale;
  const imageHeight = pdfHeight * dpiScale;

  // 画像座標をディスプレイ座標に変換
  const scaleX = displayImageWidth / originalDimensions.width;
  const scaleY = displayImageHeight / originalDimensions.height;

  return {
    x: imageX * scaleX,
    y: imageY * scaleY,
    width: imageWidth * scaleX,
    height: imageHeight * scaleY,
  };
};

/**
 * 単位変換を行う汎用関数
 */
export const convertToUnits = (
  value: number,
  fromUnit: 'px' | 'mm' | 'pt',
  toUnit: 'px' | 'mm' | 'pt'
): number => {
  if (fromUnit === toUnit) return value;

  // Convert to points first, then to target unit
  let points: number;
  if (fromUnit === 'px') {
    points = pixelsToPoints(value);
  } else if (fromUnit === 'mm') {
    points = millimetersToPoints(value);
  } else {
    points = value;
  }

  if (toUnit === 'px') {
    return pointsToPixels(points);
  } else if (toUnit === 'mm') {
    return pointsToMillimeters(points);
  } else {
    return points;
  }
};
