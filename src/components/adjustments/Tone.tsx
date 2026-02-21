import Slider from '../ui/Slider';
import CurveGraph, { ChannelConfig } from './Curves';
import { Adjustments, BasicAdjustment } from '../../utils/adjustments';

interface TonePanelProps {
  adjustments: Adjustments;
  setAdjustments(adjustments: Partial<Adjustments>): any;
  histogram: ChannelConfig | null;
  theme?: string;
  isForMask?: boolean;
  onDragStateChange?: (isDragging: boolean) => void;
}

export default function TonePanel({
  adjustments,
  setAdjustments,
  histogram,
  theme = 'dark',
  isForMask = false,
  onDragStateChange,
}: TonePanelProps) {
  const handleAdjustmentChange = (key: BasicAdjustment, value: any) => {
    const numericValue = parseFloat(value);
    setAdjustments((prev: Partial<Adjustments>) => ({ ...prev, [key]: numericValue }));
  };

  return (
    <div>
      <Slider
        label="Brightness"
        max={5}
        min={-5}
        onChange={(e: any) => handleAdjustmentChange(BasicAdjustment.Brightness, e.target.value)}
        step={0.01}
        value={adjustments.brightness}
        onDragStateChange={onDragStateChange}
      />
      <Slider
        label="Contrast"
        max={100}
        min={-100}
        onChange={(e: any) => handleAdjustmentChange(BasicAdjustment.Contrast, e.target.value)}
        step={1}
        value={adjustments.contrast}
        onDragStateChange={onDragStateChange}
      />
      <Slider
        label="Highlights"
        max={100}
        min={-100}
        onChange={(e: any) => handleAdjustmentChange(BasicAdjustment.Highlights, e.target.value)}
        step={1}
        value={adjustments.highlights}
        onDragStateChange={onDragStateChange}
      />
      <Slider
        label="Shadows"
        max={100}
        min={-100}
        onChange={(e: any) => handleAdjustmentChange(BasicAdjustment.Shadows, e.target.value)}
        step={1}
        value={adjustments.shadows}
        onDragStateChange={onDragStateChange}
      />
      <Slider
        label="Whites"
        max={100}
        min={-100}
        onChange={(e: any) => handleAdjustmentChange(BasicAdjustment.Whites, e.target.value)}
        step={1}
        value={adjustments.whites}
        onDragStateChange={onDragStateChange}
      />
      <Slider
        label="Blacks"
        max={100}
        min={-100}
        onChange={(e: any) => handleAdjustmentChange(BasicAdjustment.Blacks, e.target.value)}
        step={1}
        value={adjustments.blacks}
        onDragStateChange={onDragStateChange}
      />

      <CurveGraph
        adjustments={adjustments}
        setAdjustments={setAdjustments}
        histogram={histogram}
        theme={theme}
        isForMask={isForMask}
        onDragStateChange={onDragStateChange}
      />
    </div>
  );
}
