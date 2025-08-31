import { useState, useCallback } from 'react';
import type { BoundingBox, BoundingBoxKind } from '../utils/types';

export const useBoundingBoxes = () => {
  const [boundingBoxes, setBoundingBoxes] = useState<BoundingBox[]>([]);

  // 境界ボックスを追加
  const addBoundingBox = useCallback((box: BoundingBox) => {
    setBoundingBoxes((prev) => [...prev, box]);
  }, []);

  // 境界ボックスを追加（複数）
  const addBoundingBoxes = useCallback((boxes: BoundingBox[]) => {
    setBoundingBoxes((prev) => [...prev, ...boxes]);
  }, []);

  // 境界ボックスを削除
  const removeBoundingBox = useCallback((id: string) => {
    setBoundingBoxes((prev) => prev.filter((box) => box.id !== id));
  }, []);

  // 特定の種類の境界ボックスを削除
  const removeBoundingBoxesByKind = useCallback((kind: BoundingBoxKind) => {
    setBoundingBoxes((prev) => prev.filter((box) => box.kind !== kind));
  }, []);

  // 全ての境界ボックスをクリア
  const clearBoundingBoxes = useCallback(() => {
    setBoundingBoxes([]);
  }, []);

  // 境界ボックスを更新
  const updateBoundingBox = useCallback(
    (id: string, updates: Partial<BoundingBox>) => {
      setBoundingBoxes((prev) =>
        prev.map((box) => (box.id === id ? { ...box, ...updates } : box))
      );
    },
    []
  );

  // 特定の境界ボックスを取得
  const getBoundingBox = useCallback(
    (id: string) => {
      return boundingBoxes.find((box) => box.id === id);
    },
    [boundingBoxes]
  );

  // 特定の種類の境界ボックスを取得
  const getBoundingBoxesByKind = useCallback(
    (kind: BoundingBoxKind) => {
      return boundingBoxes.filter((box) => box.kind === kind);
    },
    [boundingBoxes]
  );

  // 境界ボックスの統計を取得
  const getBoundingBoxesStats = useCallback(() => {
    const total = boundingBoxes.length;
    const byKind = boundingBoxes.reduce((acc, box) => {
      const kind = box.kind || 'manual';
      acc[kind] = (acc[kind] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      byKind,
      hasOCR: byKind.ocr > 0,
      hasTable: byKind.table > 0,
      hasManual: byKind.manual > 0,
    };
  }, [boundingBoxes]);

  return {
    boundingBoxes,
    addBoundingBox,
    addBoundingBoxes,
    removeBoundingBox,
    removeBoundingBoxesByKind,
    clearBoundingBoxes,
    updateBoundingBox,
    getBoundingBox,
    getBoundingBoxesByKind,
    getBoundingBoxesStats,
  };
};
