
import { useEffect, useState } from "react";
import { HeroMedia } from "@/modules/hero/components/HeroMedia";
import { HeroOverlay } from "@/modules/hero/components/HeroOverlay";
import { InsertHeroCampaign } from "@shared/schema";

// Simplified type for the incoming message data, matching the form values
type PreviewData = Partial<InsertHeroCampaign> & {
    mediaUrlPreview?: string; // Special field for blob URLs from file uploads
};

// Default mock data for direct access
const DEFAULT_PREVIEW: PreviewData = {
    title: "Live Preview Mode",
    subtitle: "This is a sample preview. Edit the campaign settings to see your changes in real-time.",
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8", // Standard placeholder
    ctaLabel: "Sample Button",
    ctaUrl: "#",
    contentAlignment: "left",
    textColor: "#ffffff",
    overlayOpacity: "0.4",
    titleFontSize: 50,
    subtitleFontSize: 24,
    fontWeight: "bold",
    titlePosX: 50,
    titlePosY: 30,
    subtitlePosX: 50,
    subtitlePosY: 50,
    ctaPosX: 50,
    ctaPosY: 70,
};

export default function LivePreviewCampaign() {
    const [data, setData] = useState<PreviewData>(DEFAULT_PREVIEW);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Verify origin if needed, but for internal admin admin panel validation might be overkill for now
            // if (event.origin !== window.location.origin) return; 

            if (event.data && event.data.type === "generate_preview") {
                console.log("Live Preview Received:", event.data.payload);
                setData(event.data.payload);
            }
        };

        window.addEventListener("message", handleMessage);

        // Listen for cross-tab broadcasts
        const channel = new BroadcastChannel('hero_preview_channel');
        channel.onmessage = (event) => {
            if (event.data && event.data.type === "generate_preview") {
                console.log("Broadcast Preview Received:", event.data.payload);
                setData(event.data.payload);
            }
        };

        // Signal ready
        if (window.opener || window.parent) {
            window.parent.postMessage({ type: 'preview_ready' }, '*');
        }

        return () => window.removeEventListener("message", handleMessage);
    }, []);



    // Determine Logic
    const mediaUrl = data.mediaUrlPreview || data.mediaUrl || "";
    const mediaType = data.mediaType || "image";

    // Overlay Props Mapping
    // Note: The form data structure matches schema which matches HeroOverlay props mostly,
    // but we need to handle the nested objects if HeroOverlay expects them or flat props.
    // Looking at HeroOverlay.tsx, it takes flat props for positions and styling.

    // We need to map `data` (which is InsertHeroCampaign flat structure) to HeroOverlay props.

    return (
        <section className="relative h-screen w-full overflow-hidden bg-black text-white">
            <HeroMedia type={mediaType} url={mediaUrl} />
            <HeroOverlay
                title={data.title || "Campaign Title"}
                subtitle={data.subtitle ?? null}

                // CTA
                cta={{
                    label: data.ctaLabel ?? null,
                    href: data.ctaUrl ?? null
                }}
                secondaryCta={{
                    label: data.secondaryCtaLabel ?? null,
                    href: data.secondaryCtaUrl ?? null
                }}

                // Core styling
                alignment={data.contentAlignment || "left"}
                opacity={data.overlayOpacity ? parseFloat(data.overlayOpacity) : 0.4}
                textColor={data.textColor || "#ffffff"}

                // Metadata
                campaignId={0} // Dummy ID
                endTime={data.endTime?.toString()} // Ensure string format if needed

                // Positioning
                titlePosX={data.titlePosX ?? 50}
                titlePosY={data.titlePosY ?? 20}
                subtitlePosX={data.subtitlePosX ?? 50}
                subtitlePosY={data.subtitlePosY ?? 40}
                ctaPosX={data.ctaPosX ?? 50}
                ctaPosY={data.ctaPosY ?? 60}
                countdownPosX={data.countdownPosX ?? 50}
                countdownPosY={data.countdownPosY ?? 10}

                // New Styling
                titleFontSize={data.titleFontSize}
                subtitleFontSize={data.subtitleFontSize}
                fontWeight={data.fontWeight || "normal"}
                overlayColor={data.overlayColor || "black"}

                // Preview specific
                animationType="none" // Disable entrance animations for smoother preview updates
            />
        </section>
    );
}
