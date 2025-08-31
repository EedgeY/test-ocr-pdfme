/**
 * 画像前処理ユーティリティ
 */

/**
 * Canvas APIを使用した基本的な画像前処理
 */
export const preprocessImageBasic = (
  imageSrc: string,
  enhance: boolean = true
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      if (enhance) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // 簡易コントラスト調整
        for (let i = 0; i < data.length; i += 4) {
          const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const enhanced = Math.min(255, gray * 1.2 + 10);
          data[i] = data[i + 1] = data[i + 2] = enhanced;
        }

        ctx.putImageData(imageData, 0, 0);
      }

      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

/**
 * OpenCVを使用した高度な画像前処理
 */
export const preprocessImageWithOpenCV = (
  imageSrc: string,
  enhance: boolean = true
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx || !window.cv) {
        resolve(imageSrc);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      if (enhance) {
        try {
          const src = window.cv.imread(canvas);
          const gray = new window.cv.Mat();
          const processed = new window.cv.Mat();

          // グレースケール変換
          window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY, 0);

          // ノイズ除去
          window.cv.GaussianBlur(gray, processed, new window.cv.Size(3, 3), 0);

          // コントラスト調整
          window.cv.convertScaleAbs(processed, processed, 1.2, 10);

          // 二値化（適応的閾値）
          window.cv.adaptiveThreshold(
            processed,
            processed,
            255,
            window.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
            window.cv.THRESH_BINARY,
            11,
            2
          );

          // モルフォロジー演算でノイズ除去
          const kernel = window.cv.getStructuringElement(
            window.cv.MORPH_RECT,
            new window.cv.Size(1, 1)
          );
          window.cv.morphologyEx(
            processed,
            processed,
            window.cv.MORPH_OPEN,
            kernel
          );

          window.cv.imshow(canvas, processed);

          // クリーンアップ
          src.delete();
          gray.delete();
          processed.delete();
          kernel.delete();

          resolve(canvas.toDataURL('image/png'));
        } catch (error) {
          console.warn(
            '[v0] OpenCV preprocessing failed, using basic method:',
            error
          );
          // フォールバックとして基本的な前処理を使用
          preprocessImageBasic(imageSrc, enhance).then(resolve);
        }
      } else {
        resolve(canvas.toDataURL('image/png'));
      }
    };

    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

/**
 * 画像のコントラストを調整
 */
export const adjustContrast = (
  imageData: ImageData,
  contrast: number = 1.2
): ImageData => {
  const data = imageData.data;
  const factor =
    (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
    data[i + 1] = Math.max(
      0,
      Math.min(255, factor * (data[i + 1] - 128) + 128)
    );
    data[i + 2] = Math.max(
      0,
      Math.min(255, factor * (data[i + 2] - 128) + 128)
    );
  }

  return imageData;
};

/**
 * 画像の明るさを調整
 */
export const adjustBrightness = (
  imageData: ImageData,
  brightness: number = 10
): ImageData => {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, data[i] + brightness));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brightness));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brightness));
  }

  return imageData;
};

/**
 * 画像をグレースケールに変換
 */
export const convertToGrayscale = (imageData: ImageData): ImageData => {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = data[i + 1] = data[i + 2] = gray;
  }

  return imageData;
};

/**
 * 画像にガウシアンブラーを適用
 */
export const applyGaussianBlur = (
  imageData: ImageData,
  radius: number = 1
): ImageData => {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new Uint8ClampedArray(data);

  const sigma = radius / 3;
  const size = Math.ceil(radius * 3);
  const kernel = generateGaussianKernel(size, sigma);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        weight = 0;

      for (let ky = -size; ky <= size; ky++) {
        for (let kx = -size; kx <= size; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx));
          const py = Math.min(height - 1, Math.max(0, y + ky));
          const idx = (py * width + px) * 4;
          const k = kernel[ky + size][kx + size];

          r += data[idx] * k;
          g += data[idx + 1] * k;
          b += data[idx + 2] * k;
          a += data[idx + 3] * k;
          weight += k;
        }
      }

      const idx = (y * width + x) * 4;
      output[idx] = r / weight;
      output[idx + 1] = g / weight;
      output[idx + 2] = b / weight;
      output[idx + 3] = a / weight;
    }
  }

  return new ImageData(output, width, height);
};

/**
 * ガウシアンカーネルを生成
 */
const generateGaussianKernel = (size: number, sigma: number): number[][] => {
  const kernel: number[][] = [];
  const center = Math.floor(size / 2);

  for (let y = 0; y <= size * 2; y++) {
    kernel[y] = [];
    for (let x = 0; x <= size * 2; x++) {
      const dx = x - center - size;
      const dy = y - center - size;
      const distance = Math.sqrt(dx * dx + dy * dy);
      kernel[y][x] = Math.exp(-(distance * distance) / (2 * sigma * sigma));
    }
  }

  return kernel;
};

/**
 * 適応的閾値処理
 */
export const applyAdaptiveThreshold = (
  imageData: ImageData,
  blockSize: number = 11,
  constant: number = 2
): ImageData => {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new Uint8ClampedArray(data);

  const halfBlock = Math.floor(blockSize / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;

      // ブロック内の平均値を計算
      for (
        let by = Math.max(0, y - halfBlock);
        by <= Math.min(height - 1, y + halfBlock);
        by++
      ) {
        for (
          let bx = Math.max(0, x - halfBlock);
          bx <= Math.min(width - 1, x + halfBlock);
          bx++
        ) {
          const idx = (by * width + bx) * 4;
          const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          sum += gray;
          count++;
        }
      }

      const mean = sum / count;
      const threshold = mean - constant;

      const idx = (y * width + x) * 4;
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      const binary = gray > threshold ? 255 : 0;

      output[idx] = output[idx + 1] = output[idx + 2] = binary;
      output[idx + 3] = data[idx + 3];
    }
  }

  return new ImageData(output, width, height);
};
