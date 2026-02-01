import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, Smartphone, Tablet, X } from "lucide-react";
import type { HeroCampaign } from "@shared/schema";

interface CampaignPreviewProps {
    campaign: Partial<HeroCampaign>;
    open: boolean;
    onClose: () => void;
}

type DeviceType = "desktop" | "tablet" | "mobile";

const deviceDimensions: Record<DeviceType, { width: number; height: number }> = {
    desktop: { width: 1200, height: 675 },
    tablet: { width: 768, height: 432 },
    mobile: { width: 375, height: 667 },
};

export function CampaignPreview({ campaign, open, onClose }: CampaignPreviewProps) {
    const [device, setDevice] = useState<DeviceType>("desktop");
    const dim = deviceDimensions[device];

    // Calculate scale to fit in dialog
    const maxWidth = 800;
    const scale = Math.min(1, maxWidth / dim.width);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>Preview: {campaign.name || "Untitled Campaign"}</DialogTitle>
                        <Tabs value={device} onValueChange={(v) => setDevice(v as DeviceType)}>
                            <TabsList>
                                <TabsTrigger value="desktop" className="gap-1">
                                    <Monitor className="h-4 w-4" />
                                    Desktop
                                </TabsTrigger>
                                <TabsTrigger value="tablet" className="gap-1">
                                    <Tablet className="h-4 w-4" />
                                    Tablet
                                </TabsTrigger>
                                <TabsTrigger value="mobile" className="gap-1">
                                    <Smartphone className="h-4 w-4" />
                                    Mobile
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </DialogHeader>

                <div className="flex justify-center py-4">
                    {/* Device frame */}
                    <div
                        className={`relative bg-gray-900 rounded-lg overflow-hidden shadow-2xl transition-all duration-300 ${device === "mobile" ? "rounded-3xl" : ""
                            }`}
                        style={{
                            width: dim.width * scale,
                            height: dim.height * scale,
                        }}
                    >
                        {/* Hero preview content */}
                        <div className="relative w-full h-full">
                            {/* Background */}
                            {campaign.mediaType === "video" ? (
                                <video
                                    src={campaign.mediaUrl}
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                            ) : (
                                <img
                                    src={campaign.mediaUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8"}
                                    alt="Preview"
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                            )}

                            {/* Overlay */}
                            <div
                                className="absolute inset-0"
                                style={{
                                    backgroundColor: `rgba(0, 0, 0, ${campaign.overlayOpacity || 0.4})`,
                                }}
                            />

                            {/* Content */}
                            <div
                                className={`absolute inset-0 flex flex-col justify-center p-8 ${campaign.contentAlignment === "center"
                                        ? "items-center text-center"
                                        : campaign.contentAlignment === "right"
                                            ? "items-end text-right"
                                            : "items-start text-left"
                                    }`}
                                style={{ color: campaign.textColor || "#ffffff" }}
                            >
                                <h1
                                    className={`font-bold mb-4 ${device === "mobile" ? "text-2xl" : device === "tablet" ? "text-4xl" : "text-6xl"
                                        }`}
                                >
                                    {campaign.title || "Your Headline Here"}
                                </h1>
                                <p
                                    className={`opacity-90 mb-6 max-w-xl ${device === "mobile" ? "text-sm" : device === "tablet" ? "text-lg" : "text-xl"
                                        }`}
                                >
                                    {campaign.subtitle || "Your subheadline text goes here"}
                                </p>
                                {campaign.ctaLabel && (
                                    <button
                                        className={`bg-white text-black font-semibold rounded-full hover:bg-opacity-90 transition ${device === "mobile" ? "px-4 py-2 text-sm" : "px-6 py-3"
                                            }`}
                                    >
                                        {campaign.ctaLabel}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Mobile notch */}
                        {device === "mobile" && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-black rounded-b-xl" />
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button variant="outline" onClick={onClose}>
                        Close Preview
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
