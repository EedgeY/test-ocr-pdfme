import type { CoordinateConversion } from './coordinateConversion';

export interface TableRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TableLine {
  x: number;
  y: number;
  width?: number;
  height?: number;
  type: 'horizontal' | 'vertical';
}

export interface TableCell {
  x: number;
  y: number;
  width: number;
  height: number;
  row: number;
  col: number;
}

/**
 * 画像データから水平線を検出
 */
export const detectHorizontalLines = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  minLineLength: number = width * 0.3
): number[] => {
  const lines: number[] = [];

  for (let y = 0; y < height; y++) {
    let consecutiveDarkPixels = 0;
    let maxConsecutive = 0;

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

      if (gray < 128) {
        consecutiveDarkPixels++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveDarkPixels);
      } else {
        consecutiveDarkPixels = 0;
      }
    }

    if (maxConsecutive >= minLineLength) {
      lines.push(y);
    }
  }

  return lines;
};

/**
 * 画像データから垂直線を検出
 */
export const detectVerticalLines = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  minLineLength: number = height * 0.3
): number[] => {
  const lines: number[] = [];

  for (let x = 0; x < width; x++) {
    let consecutiveDarkPixels = 0;
    let maxConsecutive = 0;

    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4;
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

      if (gray < 128) {
        consecutiveDarkPixels++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveDarkPixels);
      } else {
        consecutiveDarkPixels = 0;
      }
    }

    if (maxConsecutive >= minLineLength) {
      lines.push(x);
    }
  }

  return lines;
};

/**
 * 線をフィルタリングして重複を除去
 */
export const filterLines = (
  lines: number[],
  maxDimension: number,
  minDistance: number = Math.max(10, maxDimension * 0.01)
): number[] => {
  if (lines.length === 0) return lines;

  lines.sort((a, b) => a - b);
  const filtered: number[] = [lines[0]];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i] - filtered[filtered.length - 1] >= minDistance) {
      filtered.push(lines[i]);
    }
  }

  return filtered;
};

/**
 * 表領域を検出
 */
export const detectTableRegions = (
  data: Uint8ClampedArray,
  width: number,
  height: number
): TableRegion[] => {
  const regions: TableRegion[] = [];
  const visited = new Set<string>();

  for (let y = 0; y < height - 50; y += 20) {
    for (let x = 0; x < width - 50; x += 20) {
      if (visited.has(`${x},${y}`)) continue;

      const region = findTableRegion(data, width, height, x, y, visited);
      if (region) {
        regions.push(region);
      }
    }
  }

  return regions;
};

/**
 * 表領域を検索
 */
export const findTableRegion = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  visited: Set<string>
): TableRegion | null => {
  let minX = startX;
  let maxX = startX;
  let minY = startY;
  let maxY = startY;

  const stack = [[startX, startY]];
  const regionPixels = new Set<string>();

  while (stack.length > 0 && regionPixels.size < 10000) {
    const [x, y] = stack.pop()!;
    const key = `${x},${y}`;

    if (visited.has(key) || regionPixels.has(key)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const idx = (y * width + x) * 4;
    const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

    if (gray < 150) {
      regionPixels.add(key);
      visited.add(key);

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }

  const regionWidth = maxX - minX;
  const regionHeight = maxY - minY;

  if (regionWidth < 100 || regionHeight < 50) return null;
  if (regionWidth > width * 0.9 || regionHeight > height * 0.9) return null;

  return {
    x: minX,
    y: minY,
    width: regionWidth,
    height: regionHeight,
  };
};

/**
 * セルが有効かどうかを検証
 */
export const isValidCell = (
  x: number,
  y: number,
  width: number,
  height: number,
  imgWidth: number,
  imgHeight: number
): boolean => {
  if (width < 20 || height < 15) return false;
  if (width > imgWidth * 0.9 || height > imgHeight * 0.9) return false;
  if (x < 0 || y < 0 || x + width > imgWidth || y + height > imgHeight)
    return false;

  const aspectRatio = width / height;
  if (aspectRatio < 0.1 || aspectRatio > 10) return false;

  return true;
};

/**
 * 線交差点から表セルを作成
 */
export const createCellsFromLines = (
  horizontalLines: number[],
  verticalLines: number[],
  imgWidth: number,
  imgHeight: number
): TableCell[] => {
  const cells: TableCell[] = [];

  if (horizontalLines.length < 2 || verticalLines.length < 2) return cells;

  for (let row = 0; row < horizontalLines.length - 1; row++) {
    for (let col = 0; col < verticalLines.length - 1; col++) {
      const cellX = verticalLines[col];
      const cellY = horizontalLines[row];
      const cellWidth = verticalLines[col + 1] - verticalLines[col];
      const cellHeight = horizontalLines[row + 1] - horizontalLines[row];

      if (
        isValidCell(cellX, cellY, cellWidth, cellHeight, imgWidth, imgHeight)
      ) {
        cells.push({
          x: cellX,
          y: cellY,
          width: cellWidth,
          height: cellHeight,
          row,
          col,
        });
      }
    }
  }

  return cells;
};

/**
 * 表領域を境界ボックス形式に変換
 */
export const convertTableRegionToBoundingBox = (
  region: TableRegion,
  convertToPDFCoords: (
    x: number,
    y: number,
    width: number,
    height: number
  ) => CoordinateConversion | null,
  id: string,
  unit: 'px' | 'mm' | 'pt'
) => {
  const coords = convertToPDFCoords(
    region.x,
    region.y,
    region.width,
    region.height
  );
  if (!coords) return null;

  return {
    id,
    x: coords.pt.x,
    y: coords.pt.y,
    width: coords.pt.width,
    height: coords.pt.height,
    unit,
    kind: 'table' as const,
  };
};

/**
 * 表セルを境界ボックス形式に変換
 */
export const convertTableCellToBoundingBox = (
  cell: TableCell,
  convertToPDFCoords: (
    x: number,
    y: number,
    width: number,
    height: number
  ) => CoordinateConversion | null,
  unit: 'px' | 'mm' | 'pt'
) => {
  const coords = convertToPDFCoords(cell.x, cell.y, cell.width, cell.height);
  if (!coords) return null;

  return {
    id: `cell-${Date.now()}-${cell.row}-${cell.col}`,
    x: coords.pt.x,
    y: coords.pt.y,
    width: coords.pt.width,
    height: coords.pt.height,
    unit,
    kind: 'table' as const,
  };
};

/**
 * 表線を境界ボックス形式に変換
 */
export const convertTableLineToBoundingBox = (
  line: TableLine,
  convertToPDFCoords: (
    x: number,
    y: number,
    width: number,
    height: number
  ) => CoordinateConversion | null,
  id: string,
  unit: 'px' | 'mm' | 'pt'
) => {
  const width = line.type === 'horizontal' ? line.width || 1 : 1;
  const height = line.type === 'vertical' ? line.height || 1 : 1;

  const coords = convertToPDFCoords(line.x, line.y, width, height);
  if (!coords) return null;

  return {
    id,
    x: coords.pt.x,
    y: coords.pt.y,
    width: coords.pt.width,
    height: coords.pt.height,
    unit,
    kind: 'table' as const,
  };
};
