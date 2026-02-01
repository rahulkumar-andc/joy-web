import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertHeroCampaignSchema, type HeroCampaign, type InsertHeroCampaign } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, MoreVertical, Calendar, Eye, MousePointerClick, Loader2, Edit, Trash, Play, Pause } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AdminCampaigns() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<HeroCampaign | null>(null);

    const { data: campaigns, isLoading } = useQuery<HeroCampaign[]>({
        queryKey: ["/api/admin/hero"],
    });

    const form = useForm<InsertHeroCampaign>({
        resolver: zodResolver(insertHeroCampaignSchema),
        defaultValues: {
            name: "",
            type: "default",
            priority: 0,
            isActive: false,
            mediaType: "image",
            mediaUrl: "",
            title: "",
            subtitle: "",
            ctaLabel: "",
            ctaUrl: "",
            contentAlignment: "left",
            textColor: "#ffffff",
            overlayOpacity: "0.4",
            targetAudience: "all",
            // Initialize endTime as null or undefined. 
            // Note: Schema expects Date | null | undefined. Form input gives string.
            // We'll handle conversion in render/submit if needed, or rely on coercion.
            endTime: null,
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data: InsertHeroCampaign) => {
            const res = await apiRequest("POST", "/api/admin/hero", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/hero"] });
            queryClient.invalidateQueries({ queryKey: ["/api/hero"] }); // Update frontend too
            toast({ title: "Campaign created" });
            setIsOpen(false);
            form.reset();
        },
        onError: (error: Error) => {
            toast({ title: "Failed to create campaign", description: error.message, variant: "destructive" });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<InsertHeroCampaign> }) => {
            const res = await apiRequest("PUT", `/api/admin/hero/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/hero"] });
            queryClient.invalidateQueries({ queryKey: ["/api/hero"] });
            toast({ title: "Campaign updated" });
            setIsOpen(false);
            setEditingCampaign(null);
            form.reset();
        },
        onError: (error: Error) => {
            toast({ title: "Failed to update campaign", description: error.message, variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/admin/hero/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/hero"] });
            queryClient.invalidateQueries({ queryKey: ["/api/hero"] });
            toast({ title: "Campaign deleted" });
        },
        onError: (error: Error) => {
            toast({ title: "Failed to delete campaign", description: error.message, variant: "destructive" });
        }
    });

    const onSubmit = (data: InsertHeroCampaign) => {
        // Guardrail: Overlay Detection logic (Simplified: Client-side check)
        if (data.isActive) {
            const overlapping = campaigns?.find(c =>
                c.isActive &&
                c.priority === data.priority &&
                c.id !== editingCampaign?.id
                // Note: Real overlap check would need time windows too if implemented
            );

            if (overlapping) {
                if (!confirm(`Warning: Campaign "${overlapping.name}" is already active with priority ${data.priority}. \n\nAre you sure you want to activate this one too? The system will pick the most recently updated one.`)) {
                    return;
                }
            }
        }

        const payload = {
            ...data,
            endTime: data.endTime instanceof Date ? data.endTime.toISOString() : data.endTime,
        };

        if (editingCampaign) {
            updateMutation.mutate({ id: editingCampaign.id, data: payload as any });
        } else {
            createMutation.mutate(payload as any);
        }
    };

    const handleEdit = (campaign: HeroCampaign) => {
        setEditingCampaign(campaign);
        form.reset({
            name: campaign.name,
            type: campaign.type as any,
            priority: campaign.priority,
            isActive: campaign.isActive,
            mediaType: campaign.mediaType as any,
            mediaUrl: campaign.mediaUrl,
            title: campaign.title,
            subtitle: campaign.subtitle || "",
            ctaLabel: campaign.ctaLabel || "",
            ctaUrl: campaign.ctaUrl || "",
            contentAlignment: campaign.contentAlignment as any,
            textColor: campaign.textColor,
            overlayOpacity: String(campaign.overlayOpacity),
            targetAudience: campaign.targetAudience as any,
            endTime: campaign.endTime ? new Date(campaign.endTime) : null,
        });
        setIsOpen(true);
    };

    const handleAddNew = () => {
        setEditingCampaign(null);
        form.reset({
            name: "",
            type: "default",
            priority: 0,
            isActive: false,
            mediaType: "image",
            mediaUrl: "",
            title: "",
            subtitle: "",
            ctaLabel: "",
            ctaUrl: "",
            contentAlignment: "left",
            textColor: "#ffffff",
            overlayOpacity: "0.4",
            targetAudience: "all",
            endTime: null,
        });
        setIsOpen(true);
    };

    if (isLoading) return <Loader2 className="h-8 w-8 animate-spin mx-auto mt-20" />;

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Campaign Management</h1>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleAddNew}><Plus className="mr-2 h-4 w-4" /> New Campaign</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingCampaign ? "Edit Campaign" : "Create New Campaign"}</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Campaign Name</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="priority" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Priority</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="type" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="default">Default</SelectItem>
                                                    <SelectItem value="sale">Sale</SelectItem>
                                                    <SelectItem value="flash_sale">Flash Sale</SelectItem>
                                                    <SelectItem value="festival">Festival</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="targetAudience" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Target Audience</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select audience" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="all">All Users</SelectItem>
                                                    <SelectItem value="guest">Guests Only</SelectItem>
                                                    <SelectItem value="user">Logged-in Only</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="isActive" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-8">
                                            <div className="space-y-0.5">
                                                <FormLabel>Active Status</FormLabel>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                </div>


                                <div className="space-y-2 border p-4 rounded-md">
                                    <h3 className="font-medium">Media</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="mediaType" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Media Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="image">Image</SelectItem>
                                                        <SelectItem value="video">Video</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="mediaUrl" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Media URL</FormLabel>
                                                <FormControl><Input {...field} placeholder="https://..." /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                </div>

                                <div className="space-y-2 border p-4 rounded-md">
                                    <h3 className="font-medium">Content</h3>
                                    <FormField control={form.control} name="title" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Title</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="subtitle" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Subtitle</FormLabel>
                                            <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="ctaLabel" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>CTA Label</FormLabel>
                                                <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="ctaUrl" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>CTA Destination</FormLabel>
                                                <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                    <FormField control={form.control} name="endTime" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Campaign End Time (for Countdown)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="datetime-local"
                                                    {...field}
                                                    value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                                                    onChange={e => {
                                                        const date = e.target.value ? new Date(e.target.value) : null;
                                                        field.onChange(date);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="space-y-2 border p-4 rounded-md">
                                    <h3 className="font-medium">Appearance</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <FormField control={form.control} name="contentAlignment" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Alignment</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="left">Left</SelectItem>
                                                        <SelectItem value="center">Center</SelectItem>
                                                        <SelectItem value="right">Right</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="textColor" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Text Color</FormLabel>
                                                <FormControl><Input type="color" {...field} className="h-10 px-2" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="overlayOpacity" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Overlay Opacity (0-1)</FormLabel>
                                                <FormControl><Input type="number" step="0.1" min="0" max="1" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                </div>

                                <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {editingCampaign ? "Update Campaign" : "Create Campaign"}
                                </Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6">
                {campaigns?.map((campaign) => (
                    <Card key={campaign.id} className={campaign.isActive ? "border-primary border-2" : ""}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div>
                                <CardTitle className="text-xl font-bold flex items-center gap-2">
                                    {campaign.name}
                                    {campaign.isActive && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Active</span>}
                                    <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">{campaign.type}</span>
                                </CardTitle>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="icon" onClick={() => handleEdit(campaign)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="destructive" size="icon" onClick={() => {
                                    if (confirm("Are you sure?")) deleteMutation.mutate(campaign.id);
                                }}>
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <p className="font-semibold">{campaign.title}</p>
                                    <p className="text-sm text-gray-500">{campaign.subtitle}</p>
                                    <p className="text-xs text-gray-400 mt-2">Priority: {campaign.priority}</p>
                                </div>
                                <div>
                                    {campaign.mediaType === 'video' ? (
                                        <div className="aspect-video bg-black rounded-md flex items-center justify-center text-white">
                                            <Play className="h-8 w-8" /> Video
                                        </div>
                                    ) : (
                                        <img src={campaign.mediaUrl} alt={campaign.title} className="aspect-video object-cover rounded-md" />
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {campaigns?.length === 0 && (
                    <div className="text-center py-20 text-gray-500">
                        No campaigns found. Create one to get started.
                    </div>
                )}
            </div>
        </div>
    );
}

