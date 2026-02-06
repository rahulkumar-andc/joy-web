import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertHeroCampaignSchema, type HeroCampaign, type InsertHeroCampaign } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, MoreVertical, Calendar, Eye, MousePointerClick, Loader2, Edit, Trash, Play, Pause, AlertTriangle, Upload, Link } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { AdminLayout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";

export default function AdminCampaigns() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<HeroCampaign | null>(null);
    const [mediaSource, setMediaSource] = useState<"url" | "upload">("url");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        broadcastChannelRef.current = new BroadcastChannel('hero_preview_channel');
        return () => {
            broadcastChannelRef.current?.close();
        };
    }, []);

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
            endTime: null,
            titleOffsetX: 0,
            titleOffsetY: 0,
            subtitleOffsetX: 0,
            subtitleOffsetY: 50,
            ctaOffsetX: 0,
            ctaOffsetY: 100,
            countdownOffsetX: 0,
            countdownOffsetY: -100,
            // New Fields Defaults
            startTime: null,
            titleFontSize: null,
            subtitleFontSize: null,
            fontWeight: "normal",
            overlayColor: "black",
            deviceTarget: "all",
            enableAnalytics: false,
            secondaryCtaLabel: "",
            secondaryCtaUrl: "",
            // Dynamic Styling (2025)
            titleColor: "#ffffff",
            subtitleColor: "#ffffff",
            buttonColor: "#ffffff",
            fontFamily: "Inter",
        },
    });

    // Watch form values for live preview
    const formValues = form.watch();

    useEffect(() => {
        const syncPreview = async () => {
            if (!iframeRef.current?.contentWindow) return;

            const payload = { ...formValues };

            // Handle local file preview
            if (mediaSource === "upload" && selectedFile) {
                // Create temporary blob URL for preview
                const blobUrl = URL.createObjectURL(selectedFile);
                (payload as any).mediaUrlPreview = blobUrl;
            }

            // Send to iframe
            if (iframeRef.current && iframeRef.current.contentWindow) {
                const message = {
                    type: "generate_preview",
                    payload
                };
                iframeRef.current.contentWindow.postMessage(message, "*");

                // Also broadcast for standalone tabs
                if (broadcastChannelRef.current) {
                    broadcastChannelRef.current.postMessage(message);
                }
            }
        };

        const timer = setTimeout(syncPreview, 300); // Debounce 300ms
        return () => clearTimeout(timer);
    }, [formValues, selectedFile, mediaSource]);

    const createMutation = useMutation({
        mutationFn: async (data: InsertHeroCampaign | FormData) => {
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
        mutationFn: async ({ id, data }: { id: number; data: Partial<InsertHeroCampaign> | FormData }) => {
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

    const toggleMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
            const res = await apiRequest("PATCH", `/api/admin/hero/${id}/toggle`, { isActive });
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/hero"] });
            queryClient.invalidateQueries({ queryKey: ["/api/hero"] });
            toast({
                title: variables.isActive ? "Campaign activated" : "Campaign deactivated",
                description: variables.isActive ? "All other campaigns have been deactivated." : undefined
            });
        },
        onError: (error: Error) => {
            toast({ title: "Failed to toggle campaign", description: error.message, variant: "destructive" });
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

        if (mediaSource === "upload" && selectedFile) {
            const formData = new FormData();
            Object.entries(payload).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    if (key === 'enableAnalytics') {
                        formData.append(key, value === true || value === "true" ? "true" : "false");
                    } else {
                        formData.append(key, String(value));
                    }
                }
            });
            formData.append("mediaFile", selectedFile);

            if (editingCampaign) {
                updateMutation.mutate({ id: editingCampaign.id, data: formData });
            } else {
                createMutation.mutate(formData);
            }
        } else {
            if (editingCampaign) {
                updateMutation.mutate({ id: editingCampaign.id, data: payload as any });
            } else {
                createMutation.mutate(payload as any);
            }
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
            titleOffsetX: campaign.titleOffsetX ?? 0,
            titleOffsetY: campaign.titleOffsetY ?? 0,
            subtitleOffsetX: campaign.subtitleOffsetX ?? 0,
            subtitleOffsetY: campaign.subtitleOffsetY ?? 50,
            ctaOffsetX: campaign.ctaOffsetX ?? 0,
            ctaOffsetY: campaign.ctaOffsetY ?? 100,
            countdownOffsetX: campaign.countdownOffsetX ?? 0,
            countdownOffsetY: campaign.countdownOffsetY ?? -100,
            endTime: campaign.endTime ? new Date(campaign.endTime) : null,
            // New Fields Hydration
            startTime: campaign.startTime ? new Date(campaign.startTime) : null,
            titleFontSize: campaign.titleFontSize,
            subtitleFontSize: campaign.subtitleFontSize,
            fontWeight: (campaign.fontWeight as "normal" | "bold") ?? "normal",
            overlayColor: (campaign.overlayColor as "black" | "gradient" | "brand") ?? "black",
            deviceTarget: (campaign.deviceTarget as "all" | "desktop" | "mobile") ?? "all",
            enableAnalytics: campaign.enableAnalytics ?? false,
            secondaryCtaLabel: campaign.secondaryCtaLabel || "",
            secondaryCtaUrl: campaign.secondaryCtaUrl || "",
            // Dynamic Styling (2025)
            titleColor: campaign.titleColor || "#ffffff",
            subtitleColor: campaign.subtitleColor || "#ffffff",
            buttonColor: campaign.buttonColor || "#ffffff",
            fontFamily: campaign.fontFamily || "Inter",
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
            titleOffsetX: 0,
            titleOffsetY: 0,
            subtitleOffsetX: 0,
            subtitleOffsetY: 50,
            ctaOffsetX: 0,
            ctaOffsetY: 100,
            countdownOffsetX: 0,
            countdownOffsetY: -100,
            // New Fields Reset
            startTime: null,
            titleFontSize: null,
            subtitleFontSize: null,
            fontWeight: "normal",
            overlayColor: "black",
            deviceTarget: "all",
            enableAnalytics: false,
            secondaryCtaLabel: "",
            secondaryCtaUrl: "",
            // Dynamic Styling (2025)
            titleColor: "#ffffff",
            subtitleColor: "#ffffff",
            buttonColor: "#ffffff",
            fontFamily: "Inter",
        });
        setIsOpen(true);
    };

    if (isLoading) return (
        <AdminLayout title="Campaigns" subtitle="Manage hero section campaigns">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mt-20" />
        </AdminLayout>
    );

    return (
        <AdminLayout
            title="Campaigns Management"
            subtitle="Manage your store's hero banners and active campaigns."
        >
            <div className="flex justify-end mb-6">
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleAddNew}><Plus className="mr-2 h-4 w-4" /> New Campaign</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingCampaign ? "Edit Campaign" : "Create New Campaign"}</DialogTitle>
                            <DialogDescription>
                                Configure the hero banner details. Changes are previewed live on the right.
                            </DialogDescription>
                        </DialogHeader>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                    {/* Left Column: Form Inputs */}
                                    <div className="lg:col-span-5 space-y-4 max-h-[75vh] overflow-y-auto pr-2">
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

                                            <FormField control={form.control} name="deviceTarget" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Device Target</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select device" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="all">All Devices</SelectItem>
                                                            <SelectItem value="desktop">Desktop Only</SelectItem>
                                                            <SelectItem value="mobile">Mobile Only</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>

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

                                        <FormField control={form.control} name="enableAnalytics" render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-8">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Enable Analytics</FormLabel>
                                                    <p className="text-xs text-muted-foreground">Track simple impressions & clicks</p>
                                                </div>
                                                <FormControl>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                            </FormItem>
                                        )} />


                                        <div className="space-y-2 border p-4 rounded-md">
                                            <h3 className="font-medium">Media</h3>

                                            <div className="flex gap-4 mb-4">
                                                <Button
                                                    type="button"
                                                    variant={mediaSource === "url" ? "default" : "outline"}
                                                    onClick={() => setMediaSource("url")}
                                                    className="w-1/2"
                                                >
                                                    <Link className="w-4 h-4 mr-2" /> URL
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant={mediaSource === "upload" ? "default" : "outline"}
                                                    onClick={() => setMediaSource("upload")}
                                                    className="w-1/2"
                                                >
                                                    <Upload className="w-4 h-4 mr-2" /> Upload File
                                                </Button>
                                            </div>

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

                                                {mediaSource === "url" ? (
                                                    <FormField control={form.control} name="mediaUrl" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Media URL</FormLabel>
                                                            <FormControl><Input {...field} placeholder="https://..." /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                ) : (
                                                    <FormItem>
                                                        <FormLabel>Upload File (Max 50MB)</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="file"
                                                                accept={form.getValues("mediaType") === "video" ? "video/*" : "image/*"}
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) setSelectedFile(file);
                                                                }}
                                                            />
                                                        </FormControl>
                                                        {selectedFile && <p className="text-xs text-muted-foreground">Selected: {selectedFile.name}</p>}
                                                    </FormItem>
                                                )}
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
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={form.control} name="secondaryCtaLabel" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Secondary CTA Label</FormLabel>
                                                        <FormControl><Input {...field} value={field.value || ""} placeholder="Optional" /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="secondaryCtaUrl" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Secondary CTA URL</FormLabel>
                                                        <FormControl><Input {...field} value={field.value || ""} placeholder="/..." /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={form.control} name="startTime" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Start Time</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="datetime-local"
                                                                {...field}
                                                                value={
                                                                    field.value && !isNaN(new Date(field.value).getTime())
                                                                        ? new Date(field.value).toISOString().slice(0, 16)
                                                                        : ""
                                                                }
                                                                onChange={e => {
                                                                    const date = e.target.value ? new Date(e.target.value) : null;
                                                                    field.onChange(date);
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="endTime" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>End Time</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="datetime-local"
                                                                {...field}
                                                                value={
                                                                    field.value && !isNaN(new Date(field.value).getTime())
                                                                        ? new Date(field.value).toISOString().slice(0, 16)
                                                                        : ""
                                                                }
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
                                        </div>

                                        {/* Layout Configuration */}
                                        <div className="space-y-4 pt-4 border-t">
                                            <h3 className="font-medium text-lg">Layout Configuration (Position 0-100%)</h3>

                                            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                                                {/* Title Position */}
                                                <div className="space-y-2">
                                                    <FormLabel className="font-medium">Title Offset (px from center)</FormLabel>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <FormField control={form.control} name="titleOffsetX" render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs text-muted-foreground">Offset X</FormLabel>
                                                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                                            </FormItem>
                                                        )} />
                                                        <FormField control={form.control} name="titleOffsetY" render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs text-muted-foreground">Offset Y</FormLabel>
                                                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                                            </FormItem>
                                                        )} />
                                                    </div>
                                                </div>

                                                {/* Subtitle Position */}
                                                <div className="space-y-2">
                                                    <FormLabel className="font-medium">Subtitle Offset</FormLabel>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <FormField control={form.control} name="subtitleOffsetX" render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs text-muted-foreground">Offset X</FormLabel>
                                                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                                            </FormItem>
                                                        )} />
                                                        <FormField control={form.control} name="subtitleOffsetY" render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs text-muted-foreground">Offset Y</FormLabel>
                                                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                                            </FormItem>
                                                        )} />
                                                    </div>
                                                </div>

                                                {/* CTA Position */}
                                                <div className="space-y-2">
                                                    <FormLabel className="font-medium">CTA Button Offset</FormLabel>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <FormField control={form.control} name="ctaOffsetX" render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs text-muted-foreground">Offset X</FormLabel>
                                                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                                            </FormItem>
                                                        )} />
                                                        <FormField control={form.control} name="ctaOffsetY" render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs text-muted-foreground">Offset Y</FormLabel>
                                                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                                            </FormItem>
                                                        )} />
                                                    </div>
                                                </div>

                                                {/* Countdown Position */}
                                                <div className="space-y-2">
                                                    <FormLabel className="font-medium">Countdown Offset</FormLabel>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <FormField control={form.control} name="countdownOffsetX" render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs text-muted-foreground">Offset X</FormLabel>
                                                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                                            </FormItem>
                                                        )} />
                                                        <FormField control={form.control} name="countdownOffsetY" render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs text-muted-foreground">Offset Y</FormLabel>
                                                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                                            </FormItem>
                                                        )} />
                                                    </div>
                                                </div>
                                            </div>
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
                                                <FormField control={form.control} name="overlayColor" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Overlay Style</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="black">Classic Black</SelectItem>
                                                                <SelectItem value="gradient">Modern Gradient</SelectItem>
                                                                <SelectItem value="brand">Brand Color</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 mt-4">
                                                <FormField control={form.control} name="fontWeight" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Font Weight</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="normal">Normal</SelectItem>
                                                                <SelectItem value="bold">Bold</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="titleFontSize" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Title Size (px)</FormLabel>
                                                        <FormControl><Input type="number" placeholder="Default" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="subtitleFontSize" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Subtitle Size (px)</FormLabel>
                                                        <FormControl><Input type="number" placeholder="Default" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </div>

                                            {/* Dynamic Styling Section (2025) */}
                                            <div className="mt-6 space-y-4 border-t pt-4">
                                                <h4 className="font-medium text-sm">Dynamic Text Colors</h4>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <FormField control={form.control} name="titleColor" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Title Color</FormLabel>
                                                            <FormControl><Input type="color" {...field} className="h-10 px-2" /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name="subtitleColor" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Subtitle Color</FormLabel>
                                                            <FormControl><Input type="color" {...field} className="h-10 px-2" /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name="buttonColor" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Button Color</FormLabel>
                                                            <FormControl><Input type="color" {...field} className="h-10 px-2" /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                </div>
                                                <FormField control={form.control} name="fontFamily" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Font Family</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="Inter">Inter (Default)</SelectItem>
                                                                <SelectItem value="Roboto">Roboto</SelectItem>
                                                                <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                                                                <SelectItem value="Montserrat">Montserrat</SelectItem>
                                                                <SelectItem value="Poppins">Poppins</SelectItem>
                                                                <SelectItem value="Open Sans">Open Sans</SelectItem>
                                                                <SelectItem value="Lato">Lato</SelectItem>
                                                                <SelectItem value="Oswald">Oswald</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Live Preview */}
                                    <div className="hidden lg:block lg:col-span-7 bg-muted rounded-lg border overflow-hidden relative w-full h-[100vh] min-h-[720px]">
                                        <div className="absolute top-2 right-2 z-10 bg-black/70 text-white text-xs px-2 py-1 rounded pointer-events-none">
                                            Live Preview
                                        </div>
                                        <iframe
                                            ref={iframeRef}
                                            src="/admin/campaigns/livepreview"
                                            className="w-full h-full border-0"
                                            title="Campaign Live Preview"
                                        />
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                        {createMutation.isPending || updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        {editingCampaign ? "Update Campaign" : "Create Campaign"}
                                    </Button>
                                </DialogFooter>
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
                                    {campaign.isActive && <Badge variant="default" className="bg-green-600">Active</Badge>}
                                    <Badge variant="secondary">{campaign.type}</Badge>
                                </CardTitle>
                                <CardDescription>
                                    {campaign.isActive
                                        ? "Currently live on the storefront"
                                        : "Inactive (not visible to users)"}
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant={campaign.isActive ? "secondary" : "default"}
                                    size="sm"
                                    onClick={() => toggleMutation.mutate({ id: campaign.id, isActive: !campaign.isActive })}
                                    disabled={toggleMutation.isPending}
                                >
                                    {campaign.isActive ? (
                                        <><Pause className="h-4 w-4 mr-1" /> Deactivate</>
                                    ) : (
                                        <><Play className="h-4 w-4 mr-1" /> Activate</>
                                    )}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleEdit(campaign)}>
                                    <Edit className="h-4 w-4 mr-1" /> Edit
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => {
                                    if (confirm("Are you sure?")) deleteMutation.mutate(campaign.id);
                                }}>
                                    <Trash className="h-4 w-4 mr-1" /> Delete
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div>
                                        <p className="font-semibold text-lg">{campaign.title}</p>
                                        <p className="text-sm text-gray-500">{campaign.subtitle}</p>
                                    </div>
                                    <div className="flex gap-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-1">
                                            <MousePointerClick className="h-4 w-4" />
                                            <span>Priority: {campaign.priority}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            <span>
                                                {campaign.endTime && !isNaN(new Date(campaign.endTime).getTime())
                                                    ? format(new Date(campaign.endTime), "MMM d, yyyy")
                                                    : "No End Date"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <Badge variant="outline" className="text-xs">Audience: {campaign.targetAudience}</Badge>
                                    </div>
                                </div>
                                <div>
                                    {campaign.mediaType === 'video' ? (
                                        <div className="aspect-video bg-black rounded-md flex items-center justify-center text-white">
                                            <Play className="h-8 w-8 mr-2" /> Video Content
                                        </div>
                                    ) : (
                                        <img src={campaign.mediaUrl} alt={campaign.title} className="aspect-video object-cover rounded-md border" />
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {campaigns?.length === 0 && (
                    <div className="text-center py-20 bg-muted/20 rounded-lg border-dashed border-2">
                        <p className="text-muted-foreground mb-4">No campaigns found. Create one to get started.</p>
                        <Button onClick={handleAddNew}><Plus className="mr-2 h-4 w-4" /> Create First Campaign</Button>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
