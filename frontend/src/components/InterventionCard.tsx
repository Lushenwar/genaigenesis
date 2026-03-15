import { ImageSlider } from "./ImageSlider";
import beforeImg from "@/assets/before-street.jpg";
import afterImg from "@/assets/after-street.jpg";

interface InterventionCardProps {
  refId: string;
  coords: string;
  type: string;
  coolingCap: string;
  roi: string;
  shade: string;
  evapotranspiration: string;
  albedo: string;
  cost: string;
  confidence: number;
}

export function InterventionCard({
  refId, coords, type, coolingCap, roi, shade, evapotranspiration, albedo, cost, confidence
}: InterventionCardProps) {
  return (
    <div className="border border-border rounded-md bg-background p-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="font-mono-data text-[10px] text-muted-foreground">{refId}</span>
          <p className="text-sm font-medium text-foreground mt-0.5">
            {type} <span className="text-muted-foreground font-normal text-xs">@ {coords}</span>
          </p>
        </div>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-sm bg-accent/10 text-accent">
          High ROI
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Cooling Capacity</p>
          <p className="font-mono-data text-base font-medium text-foreground">{coolingCap} <span className="text-[10px] text-muted-foreground">InVEST</span></p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Est. ROI</p>
          <p className="font-mono-data text-base font-medium text-accent">{roi} <span className="text-[10px] text-muted-foreground">Annual</span></p>
        </div>
      </div>

      {/* InVEST */}
      <div className="grid grid-cols-3 gap-2 mb-3 p-2 rounded-sm bg-secondary">
        {[
          { label: "Shade", value: shade },
          { label: "Evapotrans.", value: evapotranspiration },
          { label: "Albedo", value: albedo },
        ].map(m => (
          <div key={m.label}>
            <p className="text-[9px] text-muted-foreground">{m.label}</p>
            <p className="font-mono-data text-xs text-foreground">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Before/After */}
      <ImageSlider before={beforeImg} after={afterImg} />

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 text-xs">
        <span className="text-muted-foreground">Est. Cost <span className="font-medium text-foreground">{cost}</span></span>
        <span className="text-muted-foreground">Confidence <span className="font-mono-data font-medium text-primary">{confidence}%</span></span>
      </div>
    </div>
  );
}
