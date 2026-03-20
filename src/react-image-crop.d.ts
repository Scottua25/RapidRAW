declare module 'react-image-crop' {
  import type { ComponentType, ReactNode } from 'react';

  export interface Crop {
    aspect?: number | null;
    height: number;
    unit?: '%' | 'px';
    width: number;
    x: number;
    y: number;
  }

  export interface PercentCrop extends Crop {
    unit: '%';
  }

  export interface PixelCrop extends Crop {
    unit: 'px';
  }

  export interface ReactCropProps {
    aspect?: number | null;
    children?: ReactNode;
    crop?: Crop | null;
    onChange?(crop: PixelCrop, percentCrop: PercentCrop): void;
    onComplete?(crop: PixelCrop, percentCrop: PercentCrop): void;
    renderSelectionAddon?(): ReactNode;
    ruleOfThirds?: boolean;
  }

  const ReactImageCrop: ComponentType<ReactCropProps>;
  export default ReactImageCrop;
}
