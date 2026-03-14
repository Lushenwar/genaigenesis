"use client";

import { useState } from "react";
import MapView from "@/components/MapComponent";
import ImageSlider from "@/components/ImageSlider";
import { Loader2, Thermometer, DollarSign, Leaf } from "lucide-react";

interface Blueprint {
  intervention_strategy: string;
  estimated_cost: number;
  projected_temperature_drop_celsius: number;
  recommended_materials: string[];
  before_image_url?: string;
  after_image_url?: string;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);

  const handleLocationSelect = async (lat: number, lng: number) => {
    setLoading(true);
    setBlueprint(null);

    try {
      const response = await fetch("http://localhost:8000/api/v1/generate-blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng, location_context: "Montreal Urban Zone" }),
      });

      if (!response.ok) throw new Error("Failed to generate blueprint");

      const data = await response.json();
      setBlueprint(data);
    } catch (error) {
      console.error("Error:", error);
      // Fallback for demo stability if backend isn't running
      setBlueprint({
        intervention_strategy: "Native tree canopy expansion with white reflective gravel beds.",
        estimated_cost: 3200,
        projected_temperature_drop_celsius: 3.8,
        recommended_materials: ["Silver Maple", "Cool Gravel", "Permeable Soil"],
        before_image_url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800",
        after_image_url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=800"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-black text-white p-6 gap-6">
      <header className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">
            ECO-PULSE
          </h1>
          <p className="text-zinc-400 text-sm">AI-Powered Urban Heat Mitigation Planner</p>
        </div>
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors">
            Saved Blueprints
          </button>
          <button className="px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors">
            Connect Cloud
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 h-[calc(100vh-160px)]">
        <section className="flex-[2] relative">
          <MapView onLocationSelect={handleLocationSelect} />
        </section>

        <aside className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4 border-b border-zinc-800 pb-2">Intervention Dashboard</h2>
          
          <div className="space-y-6">
            {!blueprint && !loading && (
              <div className="p-8 border-2 border-dashed border-zinc-800 rounded-lg text-center">
                <p className="text-zinc-500">Select a hot zone on the map to generate a cooling blueprint.</p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                <p className="text-sm text-zinc-400">Vertex AI generating blueprint...</p>
              </div>
            )}

            {blueprint && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Visual Transformation</h3>
                  <ImageSlider 
                    beforeUrl={blueprint.before_image_url || "/placeholder-before.jpg"} 
                    afterUrl={blueprint.after_image_url || "/placeholder-after.jpg"} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                      <Thermometer size={16} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Cooling</span>
                    </div>
                    <p className="text-2xl font-bold">-{blueprint.projected_temperature_drop_celsius}°C</p>
                  </div>
                  <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-2 text-green-400 mb-1">
                      <DollarSign size={16} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Est. Cost</span>
                    </div>
                    <p className="text-2xl font-bold">${blueprint.estimated_cost.toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-2 text-orange-400 mb-2">
                    <Leaf size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Proposed Strategy</h3>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {blueprint.intervention_strategy}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Technical Specifications</h3>
                  <div className="flex flex-wrap gap-2">
                    {blueprint.recommended_materials.map((material, i) => (
                      <span key={i} className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-400">
                        {material}
                      </span>
                    ))}
                  </div>
                </div>
                
                <button className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-red-900/20">
                  Save Deployment Blueprint
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

