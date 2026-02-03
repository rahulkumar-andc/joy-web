
import { heroService } from "./server/modules/hero/service";
import { db } from "./server/db";

async function createTestCampaigns() {
    try {
        console.log("Creating active campaign...");
        const active = await heroService.createCampaign({
            name: "Test Active Campaign",
            type: "promotional",
            priority: 10,
            isActive: true,
            mediaType: "image",
            mediaSource: "url",
            mediaUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800",
            title: "Test Active",
            subtitle: "This should be visible",
            contentAlignment: "center",
            textColor: "#ffffff",
            overlayOpacity: "0.5",
            targetAudience: "all",
            startTime: new Date(), // Active now
            endTime: new Date(Date.now() + 86400000) // Ends tomorrow
        });
        console.log("Active campaign created:", active.id);

        console.log("Creating scheduled campaign...");
        const scheduled = await heroService.createCampaign({
            name: "Test Scheduled Campaign",
            type: "promotional",
            priority: 20, // Higher priority but shouldn't show yet
            isActive: true, // It is "active" but scheduled for future
            mediaType: "image",
            mediaSource: "url",
            mediaUrl: "https://images.unsplash.com/photo-1529139574466-a302d2d3f524?w=800",
            title: "Test Scheduled",
            subtitle: "This should NOT be visible yet",
            contentAlignment: "left",
            textColor: "#ffffff",
            overlayOpacity: "0.5",
            targetAudience: "all",
            startTime: new Date(Date.now() + 86400000), // Starts tomorrow
            endTime: new Date(Date.now() + 172800000)
        });
        console.log("Scheduled campaign created:", scheduled.id);

    } catch (error) {
        console.error("Error creating campaigns:", error);
    } finally {
        process.exit(0);
    }
}

createTestCampaigns();
