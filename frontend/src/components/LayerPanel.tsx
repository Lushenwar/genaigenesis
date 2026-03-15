import { useState } from "react";
import { Trees, Users, Thermometer, DollarSign, Eye, EyeOff } from "lucide-react";

interface Layer {
  id: string;
  name: string;
  icon: React.ElementType;
  active: boolean;
}

const initialLayers: Layer[] = [
  { id: "vegetation", name: "Vegetation Cover", icon: Trees, active: true },
  { id: "population", name: "Population Density", icon: Users, active: true },
  { id: "heat", name: "Heat Island Index", icon: Thermometer, active: false },
  { id: "financial", name: "Financial Zones", icon: DollarSign, active: false },
];

export function LayerPanel() {
  const [layers, setLayers] = useState(initialLayers);

  const toggleLayer = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, active: !l.active } : l));
  };

  return (
    <div className="h-full min-h-0 flex flex-col border-r border-border bg-background">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-xs font-medium text-foreground">Layers</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {layers.map((layer) => (
          <button
            key={layer.id}
            onClick={() => toggleLayer(layer.id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-secondary ${
              layer.active ? "bg-secondary/60" : ""
            }`}
          >
            <layer.icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <span className="flex-1 text-sm text-foreground">{layer.name}</span>
            {layer.active ? (
              <Eye className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-muted-foreground/40" strokeWidth={1.5} />
            )}
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-border space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Plantable zones</span>
          <span className="font-mono-data font-medium text-foreground">14,202 ha</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Risk zones</span>
          <span className="font-mono-data font-medium text-foreground">10</span>
        </div>
      </div>
    </div>
  );
}
