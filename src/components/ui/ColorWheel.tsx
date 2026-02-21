import { useState, useRef, useEffect } from 'react';
import Slider from './Slider';
import Wheel from '@uiw/react-color-wheel';
import { ColorResult, HsvaColor, hsvaToHex } from '@uiw/color-convert';
import { Sun } from 'lucide-react';
import { HueSatLum } from '../../utils/adjustments';

interface ColorWheelProps {
  defaultValue: HueSatLum;
  label: string;
  onChange(hsl: HueSatLum): void;
  value: HueSatLum;
  onDragStateChange?: (isDragging: boolean) => void;
  showSaturationSlider?: boolean;
}

const ColorWheel = ({
  defaultValue = { hue: 0, saturation: 0, luminance: 0 },
  label,
  onChange,
  value,
  onDragStateChange,
  showSaturationSlider = false,
}: ColorWheelProps) => {
  const effectiveValue = value || defaultValue;
  const { hue, saturation, luminance } = effectiveValue;
  const sizerRef = useRef<any>(null);
  const [wheelSize, setWheelSize] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isWheelDragging, setIsWheelDragging] = useState(false);
  const [isLumSliderDragging, setIsLumSliderDragging] = useState(false);
  const [isSatSliderDragging, setIsSatSliderDragging] = useState(false);
  const [isLabelHovered, setIsLabelHovered] = useState(false);

  const isDragging = isWheelDragging || isLumSliderDragging || isSatSliderDragging;

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const width = entries[0].contentRect.width;
        if (width > 0) {
          setWheelSize(width);
        }
      }
    });

    const currentSizer = sizerRef.current;
    if (currentSizer) {
      observer.observe(currentSizer);
    }

    return () => {
      if (currentSizer) {
        observer.unobserve(currentSizer);
      }
    };
  }, []);

  useEffect(() => {
    const handleInteractionEnd = () => {
      setIsWheelDragging(false);
    };
    if (isWheelDragging) {
      window.addEventListener('mouseup', handleInteractionEnd);
      window.addEventListener('touchend', handleInteractionEnd);
    }
    return () => {
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchend', handleInteractionEnd);
    };
  }, [isWheelDragging]);

  useEffect(() => {
    const handleSatDragEnd = () => {
      setIsSatSliderDragging(false);
    };
    if (isSatSliderDragging) {
      window.addEventListener('mouseup', handleSatDragEnd);
      window.addEventListener('touchend', handleSatDragEnd);
    }
    return () => {
      window.removeEventListener('mouseup', handleSatDragEnd);
      window.removeEventListener('touchend', handleSatDragEnd);
    };
  }, [isSatSliderDragging]);

  useEffect(() => {
    onDragStateChange?.(isDragging);
  }, [isDragging, onDragStateChange]);

  const handleWheelChange = (color: ColorResult) => {
    onChange({ ...effectiveValue, hue: color.hsva.h, saturation: color.hsva.s });
  };

  const handleLumChange = (e: any) => {
    onChange({ ...effectiveValue, luminance: parseFloat(e.target.value) });
  };

  const handleSatChange = (e: any) => {
    onChange({ ...effectiveValue, saturation: parseFloat(e.target.value) });
  };

  const handleReset = () => {
    onChange(defaultValue);
  };

  const handleDragStart = () => {
    onDragStateChange?.(true);
    setIsWheelDragging(true);
  };

  const hsva: HsvaColor = { h: hue, s: saturation, v: 100, a: 1 };
  const hexColor = hsvaToHex(hsva);
  const saturationTrackLength = Math.max(80, wheelSize || 120);

  const pointerSize = isWheelDragging ? 14 : 12;
  const pointerOffset = pointerSize / 2;

  return (
    <div
      className="relative flex flex-col items-center gap-2"
      ref={containerRef}
    >
      <div
        className="relative cursor-pointer h-5 min-w-[60px]"
        onClick={handleReset}
        onDoubleClick={handleReset}
        onMouseEnter={() => setIsLabelHovered(true)}
        onMouseLeave={() => setIsLabelHovered(false)}
      >
        <span
          className={`absolute inset-0 flex items-center justify-center text-sm font-medium text-text-secondary select-none transition-opacity duration-200 ease-in-out ${
            isLabelHovered ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {label}
        </span>
        <span
          className={`absolute inset-0 flex items-center justify-center text-sm font-medium text-text-primary select-none transition-opacity duration-200 ease-in-out ${
            isLabelHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Reset
        </span>
      </div>

      <div className="w-full flex items-center justify-center gap-2">
        <div ref={sizerRef} className="relative w-full aspect-square">
          {wheelSize > 0 && (
            <div
              className="absolute inset-0 cursor-pointer"
              onDoubleClick={handleReset}
              onMouseDownCapture={handleDragStart}
              onTouchStartCapture={handleDragStart}
            >
              <Wheel
                color={hsva}
                height={wheelSize}
                onChange={handleWheelChange}
                pointer={({ style }) => (
                  <div style={{ ...style, zIndex: 1 }}>
                    <div
                      style={{
                        backgroundColor: saturation > 5 ? hexColor : 'transparent',
                        border: '2px solid white',
                        borderRadius: '50%',
                        boxShadow: '0 0 2px rgba(0,0,0,0.5)',
                        height: pointerSize,
                        width: pointerSize,
                        transform: `translate(-${pointerOffset}px, -${pointerOffset}px)`,
                        transition: 'width 150ms ease-out, height 150ms ease-out, transform 150ms ease-out',
                      }}
                    />
                  </div>
                )}
                width={wheelSize}
              />
            </div>
          )}
        </div>

        {showSaturationSlider && (
          <div className="w-7 flex flex-col items-center justify-center">
            <span className="text-[10px] text-text-secondary select-none mb-1">S</span>
            <div
              className="relative w-7 flex items-center justify-center"
              style={{ height: `${saturationTrackLength}px` }}
            >
              <div
                className="absolute w-1.5 rounded-full bg-card-active"
                style={{ height: `${saturationTrackLength}px` }}
              />
              <input
                className="absolute h-1.5 appearance-none bg-transparent cursor-pointer slider-input z-10"
                style={{ transform: 'rotate(-90deg)', width: `${saturationTrackLength}px` }}
                type="range"
                min="0"
                max="100"
                step="1"
                value={saturation}
                onChange={handleSatChange}
                onMouseDown={() => setIsSatSliderDragging(true)}
                onMouseUp={() => setIsSatSliderDragging(false)}
                onTouchStart={() => setIsSatSliderDragging(true)}
                onTouchEnd={() => setIsSatSliderDragging(false)}
                data-tooltip="Saturation"
              />
            </div>
          </div>
        )}
      </div>

      <div className="w-full">
        <Slider
          defaultValue={defaultValue.luminance}
          label={<Sun size={16} className="text-text-secondary" />}
          max={100}
          min={-100}
          onChange={handleLumChange}
          onDragStateChange={setIsLumSliderDragging}
          step={1}
          value={luminance}
        />
      </div>
    </div>
  );
};

export default ColorWheel;
