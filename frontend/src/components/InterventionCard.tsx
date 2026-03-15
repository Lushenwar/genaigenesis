import { ImageSlider } from "./ImageSlider";

interface InterventionCardProps {
  intervention: {
    label: string;
    reason: string;
    metrics: {
      cooling_capacity: number;
      shade_index: number;
      evapotranspiration_rate: number;
      albedo_change: number;
      estimated_cost: string;
      estimated_annual_roi: string;
      model_confidence: string;
    };
    before_image?: string;
    after_image?: string;
  };
}

export function InterventionCard({ intervention }: InterventionCardProps) {
  const { label, reason, metrics, before_image, after_image } = intervention;

  return (
    <div className="border border-border rounded-md bg-background p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="font-mono text-[10px] text-primary uppercase tracking-wider font-bold">Ref: BP-001</span>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {label}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            {reason}
          </p>
        </div>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-sm bg-primary/10 text-primary">
          High ROI
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Cooling Capacity</p>
          <p className="font-mono text-base font-semibold text-foreground">
            {metrics.cooling_capacity.toFixed(2)} <span className="text-[10px] text-muted-foreground font-normal">InVEST</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Est. ROI</p>
          <p className="font-mono text-base font-semibold text-primary">
            {metrics.estimated_annual_roi} <span className="text-[10px] text-muted-foreground font-normal">Annual</span>
          </p>
        </div>
      </div>

      {/* Detail Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-3 p-2 rounded-md bg-secondary/50 border border-border/50">
        {[
          { label: "Shade", value: metrics.shade_index.toFixed(2) },
          { label: "ETI", value: metrics.evapotranspiration_rate.toFixed(2) },
          { label: "Albedo", value: metrics.albedo_change.toFixed(2) },
        ].map(m => (
          <div key={m.label}>
            <p className="text-[9px] text-muted-foreground">{m.label}</p>
            <p className="font-mono text-xs font-medium text-foreground">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Before/After Visualization */}
      <div className="mt-4">
        <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-tight">AI Intervention Visualization</p>
        <ImageSlider 
          before={before_image || "/placeholder-before.jpg"} 
          after={after_image || "/placeholder-after.jpg"} 
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 text-xs pt-3 border-t border-border/50">
        <span className="text-muted-foreground">Est. Cost <span className="font-semibold text-foreground ml-1">{metrics.estimated_cost}</span></span>
        <span className="text-muted-foreground">Confidence <span className="font-mono font-semibold text-primary ml-1">{metrics.model_confidence}</span></span>
      </div>
      
      <button className="w-full mt-4 py-1.5 border border-border rounded-md text-[10px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
        View Conductr Trace
      </button>
    </div>
  );
}
