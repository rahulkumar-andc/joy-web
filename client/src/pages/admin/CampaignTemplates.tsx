import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Gift, Sun, Tag, Zap, Calendar } from "lucide-react";
import type { InsertHeroCampaign } from "@shared/schema";

interface CampaignTemplate {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    values: Partial<InsertHeroCampaign>;
}

const templates: CampaignTemplate[] = [
    {
        id: "flash-sale",
        name: "Flash Sale",
        description: "Time-limited deal with urgency countdown",
        icon: <Zap className="h-6 w-6" />,
        color: "from-red-500 to-orange-500",
        values: {
            name: "Flash Sale - Limited Time",
            type: "flash_sale",
            priority: 10,
            title: "⚡ Flash Sale!",
            subtitle: "Up to 70% off for the next 24 hours only!",
            ctaLabel: "Shop Now",
            ctaUrl: "/shop?sale=flash",
            contentAlignment: "center",
            overlayOpacity: "0.5",
            mediaUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1920",
        },
    },
    {
        id: "new-arrivals",
        name: "New Arrivals",
        description: "Showcase latest products",
        icon: <Sparkles className="h-6 w-6" />,
        color: "from-purple-500 to-pink-500",
        values: {
            name: "New Arrivals",
            type: "default",
            priority: 5,
            title: "New Collection",
            subtitle: "Discover the latest trends and styles just for you",
            ctaLabel: "Explore Now",
            ctaUrl: "/shop?filter=new",
            contentAlignment: "left",
            overlayOpacity: "0.4",
            mediaUrl: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1920",
        },
    },
    {
        id: "seasonal",
        name: "Seasonal Event",
        description: "Holiday or seasonal promotion",
        icon: <Calendar className="h-6 w-6" />,
        color: "from-green-500 to-teal-500",
        values: {
            name: "Seasonal Campaign",
            type: "festival",
            priority: 8,
            title: "Season's Greetings",
            subtitle: "Celebrate with exclusive seasonal offers",
            ctaLabel: "View Deals",
            ctaUrl: "/shop?category=seasonal",
            contentAlignment: "center",
            overlayOpacity: "0.45",
            mediaUrl: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=1920",
        },
    },
    {
        id: "clearance",
        name: "Clearance Sale",
        description: "End of stock clearance",
        icon: <Tag className="h-6 w-6" />,
        color: "from-yellow-500 to-amber-500",
        values: {
            name: "Clearance Sale",
            type: "sale",
            priority: 6,
            title: "Final Clearance",
            subtitle: "Last chance to grab massive discounts before they're gone",
            ctaLabel: "Shop Clearance",
            ctaUrl: "/shop?filter=clearance",
            contentAlignment: "left",
            overlayOpacity: "0.5",
            mediaUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920",
        },
    },
    {
        id: "gift-guide",
        name: "Gift Guide",
        description: "Perfect for gifting season",
        icon: <Gift className="h-6 w-6" />,
        color: "from-rose-500 to-red-500",
        values: {
            name: "Gift Guide",
            type: "default",
            priority: 4,
            title: "Gift Ideas",
            subtitle: "Find the perfect gift for everyone on your list",
            ctaLabel: "Browse Gifts",
            ctaUrl: "/shop?category=gifts",
            contentAlignment: "right",
            overlayOpacity: "0.4",
            mediaUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1920",
        },
    },
    {
        id: "summer-vibes",
        name: "Summer Vibes",
        description: "Summer collection promotion",
        icon: <Sun className="h-6 w-6" />,
        color: "from-cyan-500 to-blue-500",
        values: {
            name: "Summer Collection",
            type: "default",
            priority: 5,
            title: "Summer is Here",
            subtitle: "Hot looks for the hottest season",
            ctaLabel: "Shop Summer",
            ctaUrl: "/shop?category=summer",
            contentAlignment: "center",
            overlayOpacity: "0.35",
            mediaUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920",
        },
    },
];

interface CampaignTemplatesProps {
    onSelectTemplate: (values: Partial<InsertHeroCampaign>) => void;
}

export function CampaignTemplates({ onSelectTemplate }: CampaignTemplatesProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Quick Start Templates</h3>
                    <p className="text-sm text-muted-foreground">
                        Choose a template to get started quickly
                    </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                    {templates.length} templates
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                    <Card
                        key={template.id}
                        className="group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden"
                        onClick={() => onSelectTemplate(template.values)}
                    >
                        <div
                            className={`h-2 bg-gradient-to-r ${template.color} transition-all duration-300 group-hover:h-3`}
                        />
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`p-2 rounded-lg bg-gradient-to-br ${template.color} text-white`}
                                >
                                    {template.icon}
                                </div>
                                <div>
                                    <CardTitle className="text-base">{template.name}</CardTitle>
                                    <CardDescription className="text-xs">
                                        {template.description}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="text-sm space-y-1">
                                <p className="font-medium truncate">{template.values.title}</p>
                                <p className="text-muted-foreground text-xs truncate">
                                    {template.values.subtitle}
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="w-full mt-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                            >
                                Use Template
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

export { templates };
export type { CampaignTemplate };
