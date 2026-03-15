import { useState, useCallback } from "react";
import { Save, ExternalLink, ChevronDown } from "lucide-react";
import { LayerPanel } from "@/components/LayerPanel";
import { MapView } from "@/components/MapView";
import { IntelligencePanel } from "@/components/IntelligencePanel";
import { analyzeZone, generateBlueprint, type Top10Zone, type AnalyzeZoneResult, type BlueprintResponse } from "@/lib/api";

const Index = () => {
  const [selectedZone, setSelectedZone] = useState<Top10Zone | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeZoneResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Eco-Pulse Blueprint States
  const [blueprintData, setBlueprintData] = useState<BlueprintResponse | null>(null);
  const [blueprintLoading, setBlueprintLoading] = useState(false);
  const [blueprintError, setBlueprintError] = useState<string | null>(null);

  // Layer Visibility States
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    vegetation: true,
    population: true,
    heat: false,
    financial: false,
  });

  const toggleLayer = useCallback((id: string) => {
    setActiveLayers(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleZoneSelect = useCallback(async (zone: Top10Zone) => {
    setSelectedZone(zone);
    setAnalysis(null);
    setAnalysisError(null);
    setBlueprintData(null); // Reset blueprint on new zone
    setAnalyzing(true);
    try {
      const result = await analyzeZone(zone.zone_id);
      setAnalysis(result);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleRunBlueprint = useCallback(async () => {
    if (!selectedZone) return;
    
    setBlueprintLoading(true);
    setBlueprintError(null);
    try {
      const result = await generateBlueprint(
        selectedZone.zone_id,
        selectedZone.bounds,
        selectedZone.metrics
      );
      setBlueprintData(result);
      console.log("Blueprint generated successfully:", result);
    } catch (err) {
      console.error("Blueprint generation failed for zone:", selectedZone.zone_id, err);
      setBlueprintError(err instanceof Error ? err.message : "Blueprint generation failed.");
    } finally {
      setBlueprintLoading(false);
    }
  }, [selectedZone]);

  const handleZoneBack = useCallback(() => {
    setSelectedZone(null);
    setAnalysis(null);
    setAnalysisError(null);
  }, []);

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

      {/* Main content: min-h-0 lets the grid cell shrink; [&>*]:min-h-0 constrains columns so side panels can scroll */}
      <div className="flex-1 min-h-0 grid grid-cols-[200px_1fr_380px] overflow-hidden [&>*]:min-h-0">
        <LayerPanel 
          activeLayers={activeLayers} 
          onToggleLayer={toggleLayer} 
        />
        <div className="min-h-0 flex flex-col overflow-hidden">
          <MapView
            selectedBounds={selectedZone?.bounds ?? null}
            recommendationLayer={null}
            onRunBlueprint={handleRunBlueprint}
            activeLayers={activeLayers}
          />
        </div>
        <IntelligencePanel
          selectedZone={selectedZone}
          analysis={analysis}
          analyzing={analyzing}
          analysisError={analysisError}
          blueprintData={blueprintData}
          blueprintLoading={blueprintLoading}
          blueprintError={blueprintError}
          onZoneSelect={handleZoneSelect}
          onZoneBack={handleZoneBack}
        />
      </div>
    </div>
  );
};

export default Index;
