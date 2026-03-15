import { Save, ExternalLink, ChevronDown } from "lucide-react";
import { LayerPanel } from "@/components/LayerPanel";
import { MapView } from "@/components/MapView";
import { IntelligencePanel } from "@/components/IntelligencePanel";

const Index = () => {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-sm font-medium text-foreground">Eco-Pulse</span>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
            Save results
            <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
          </button>
          <button className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
            Open in
            <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-[200px_1fr_380px] overflow-hidden">
        <LayerPanel />
        <MapView />
        <IntelligencePanel />
      </div>
    </div>
  );
};

export default Index;
