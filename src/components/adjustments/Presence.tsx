import Slider from '../ui/Slider';
import { Adjustments, DetailsAdjustment } from '../../utils/adjustments';

interface PresencePanelProps {
  adjustments: Adjustments;
  setAdjustments(adjustments: Partial<Adjustments>): any;
  isForMask?: boolean;
  onDragStateChange?: (isDragging: boolean) => void;
}

export default function PresencePanel({
  adjustments,
  setAdjustments,
  isForMask = false,
  onDragStateChange,
}: PresencePanelProps) {
  const handleAdjustmentChange = (key: string, value: string) => {
    const numericValue = parseInt(value, 10);
    setAdjustments((prev: Partial<Adjustments>) => ({ ...prev, [key]: numericValue }));
  };

  return (
    <div className="p-2 bg-bg-tertiary rounded-md">
      <Slider
        label="Clarity"
        max={100}
        min={-100}
        onChange={(e: any) => handleAdjustmentChange(DetailsAdjustment.Clarity, e.target.value)}
        step={1}
        value={adjustments.clarity}
        onDragStateChange={onDragStateChange}
      />
      <Slider
        label="Structure"
        max={100}
        min={-100}
        onChange={(e: any) => handleAdjustmentChange(DetailsAdjustment.Structure, e.target.value)}
        step={1}
        value={adjustments.structure}
        onDragStateChange={onDragStateChange}
      />
      <Slider
        label="Dehaze"
        max={100}
        min={-100}
        onChange={(e: any) => handleAdjustmentChange(DetailsAdjustment.Dehaze, e.target.value)}
        step={1}
        value={adjustments.dehaze}
        onDragStateChange={onDragStateChange}
      />
      {!isForMask && (
        <Slider
          label="Centré"
          max={100}
          min={-100}
          onChange={(e: any) => handleAdjustmentChange(DetailsAdjustment.Centré, e.target.value)}
          step={1}
          value={adjustments.centré}
          onDragStateChange={onDragStateChange}
        />
      )}
    </div>
  );
}
