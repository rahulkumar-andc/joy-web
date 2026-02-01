import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, Eye, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { HeroCampaign, CampaignReview } from "@shared/schema";

interface PendingCampaign extends HeroCampaign {
    review?: CampaignReview;
}

export default function ContentModeration() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedCampaign, setSelectedCampaign] = useState<PendingCampaign | null>(null);
    const [reviewNotes, setReviewNotes] = useState("");
    const [previewOpen, setPreviewOpen] = useState(false);

    // Fetch all campaigns with review status
    const { data: campaigns = [], isLoading } = useQuery<PendingCampaign[]>({
        queryKey: ["/api/admin/hero/moderation"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/admin/hero");
            return res.json();
        },
    });

    // Filter by review status
    const pendingReview = campaigns.filter(c => c.review?.status === "pending" || !c.review);
    const approved = campaigns.filter(c => c.review?.status === "approved");
    const rejected = campaigns.filter(c => c.review?.status === "rejected");

    // Approve mutation
    const approveMutation = useMutation({
        mutationFn: async (campaignId: number) => {
            return apiRequest("POST", `/api/admin/hero/${campaignId}/review`, {
                status: "approved",
                reviewNotes,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/hero"] });
            toast({ title: "Campaign approved", description: "The campaign is now visible to users." });
            setSelectedCampaign(null);
            setReviewNotes("");
        },
    });

    // Reject mutation
    const rejectMutation = useMutation({
        mutationFn: async (campaignId: number) => {
            return apiRequest("POST", `/api/admin/hero/${campaignId}/review`, {
                status: "rejected",
                reviewNotes,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/hero"] });
            toast({ title: "Campaign rejected", description: "The campaign creator will be notified." });
            setSelectedCampaign(null);
            setReviewNotes("");
        },
    });

    const renderCampaignCard = (campaign: PendingCampaign, showActions = false) => (
        <Card key={campaign.id} className="overflow-hidden">
            <div className="relative h-32">
                {campaign.mediaType === "video" ? (
                    <video
                        src={campaign.mediaUrl}
                        className="w-full h-full object-cover"
                        muted
                        autoPlay
                        loop
                        playsInline
                    />
                ) : (
                    <img
                        src={campaign.mediaUrl}
                        alt={campaign.name}
                        className="w-full h-full object-cover"
                    />
                )}
                <div className="absolute inset-0 bg-black/40" />
                <Badge className="absolute top-2 right-2" variant={
                    campaign.review?.status === "approved" ? "default" :
                        campaign.review?.status === "rejected" ? "destructive" : "secondary"
                }>
                    {campaign.review?.status || "pending"}
                </Badge>
            </div>
            <CardHeader className="py-3">
                <CardTitle className="text-base">{campaign.name}</CardTitle>
                <CardDescription className="truncate">{campaign.title}</CardDescription>
            </CardHeader>
            {showActions && (
                <CardContent className="pt-0 flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                            setSelectedCampaign(campaign);
                            setPreviewOpen(true);
                        }}
                    >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                    </Button>
                    <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => {
                            setSelectedCampaign(campaign);
                            approveMutation.mutate(campaign.id);
                        }}
                    >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                            setSelectedCampaign(campaign);
                            rejectMutation.mutate(campaign.id);
                        }}
                    >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                    </Button>
                </CardContent>
            )}
        </Card>
    );

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Content Moderation</h1>
                    <p className="text-muted-foreground">Review and approve campaigns before they go live</p>
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="text-sm py-1 px-3">
                        <Clock className="h-4 w-4 mr-1" />
                        {pendingReview.length} pending
                    </Badge>
                    <Badge variant="default" className="text-sm py-1 px-3 bg-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {approved.length} approved
                    </Badge>
                    <Badge variant="destructive" className="text-sm py-1 px-3">
                        <XCircle className="h-4 w-4 mr-1" />
                        {rejected.length} rejected
                    </Badge>
                </div>
            </div>

            {/* Pending Review Section */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Pending Review ({pendingReview.length})
                </h2>
                {pendingReview.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            No campaigns pending review
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingReview.map(c => renderCampaignCard(c, true))}
                    </div>
                )}
            </section>

            {/* Recently Approved */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Recently Approved ({approved.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {approved.slice(0, 4).map(c => renderCampaignCard(c))}
                </div>
            </section>

            {/* Preview Dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Campaign Preview: {selectedCampaign?.name}</DialogTitle>
                    </DialogHeader>
                    {selectedCampaign && (
                        <div className="space-y-4">
                            <div className="relative h-64 rounded-lg overflow-hidden">
                                {selectedCampaign.mediaType === "video" ? (
                                    <video
                                        src={selectedCampaign.mediaUrl}
                                        className="w-full h-full object-cover"
                                        muted
                                        autoPlay
                                        loop
                                        controls
                                    />
                                ) : (
                                    <img
                                        src={selectedCampaign.mediaUrl}
                                        alt={selectedCampaign.name}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                <div
                                    className="absolute inset-0 flex flex-col justify-center p-8"
                                    style={{
                                        backgroundColor: `rgba(0,0,0,${selectedCampaign.overlayOpacity})`,
                                        color: selectedCampaign.textColor
                                    }}
                                >
                                    <h2 className="text-3xl font-bold mb-2">{selectedCampaign.title}</h2>
                                    <p className="text-lg opacity-90">{selectedCampaign.subtitle}</p>
                                    {selectedCampaign.ctaLabel && (
                                        <Button className="w-fit mt-4" style={{ backgroundColor: selectedCampaign.textColor, color: "black" }}>
                                            {selectedCampaign.ctaLabel}
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><strong>Type:</strong> {selectedCampaign.type}</div>
                                <div><strong>Priority:</strong> {selectedCampaign.priority}</div>
                                <div><strong>Target:</strong> {selectedCampaign.targetAudience}</div>
                                <div><strong>CTA URL:</strong> {selectedCampaign.ctaUrl}</div>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Review Notes</label>
                                <Textarea
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                    placeholder="Add notes about this campaign..."
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => selectedCampaign && rejectMutation.mutate(selectedCampaign.id)}
                        >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => selectedCampaign && approveMutation.mutate(selectedCampaign.id)}
                        >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
