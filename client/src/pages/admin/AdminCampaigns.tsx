<<<<<<< HEAD
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
=======
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Power, LayoutTemplate, MoreVertical, Eye } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
>>>>>>> 9197ee2 (vivek-showcase)
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { HeroCampaign, InsertHeroCampaign } from "@shared/schema";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CampaignPreview } from "./CampaignPreview";
import { CampaignTemplates, templates } from "./CampaignTemplates";

const campaignSchema = z.object({
    name: z.string().min(1, "Name is required"),
    title: z.string().min(1, "Title is required"),
    subtitle: z.string().optional().nullable(),
    ctaLabel: z.string().optional().nullable(),
    ctaUrl: z.string().optional().nullable(),
    mediaUrl: z.string().min(1, "Media URL is required"),
    mediaType: z.enum(["image", "video"]),
    contentAlignment: z.enum(["left", "center", "right"]),
    overlayOpacity: z.string(),
    textColor: z.string(),
    titlePosX: z.number().min(0).max(100).default(50),
    titlePosY: z.number().min(0).max(100).default(20),
    subtitlePosX: z.number().min(0).max(100).default(50),
    subtitlePosY: z.number().min(0).max(100).default(40),
    ctaPosX: z.number().min(0).max(100).default(50),
    ctaPosY: z.number().min(0).max(100).default(60),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

export default function AdminCampaigns() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [previewCampaign, setPreviewCampaign] = useState<Partial<HeroCampaign> | null>(null);
    const [editingCampaign, setEditingCampaign] = useState<HeroCampaign | null>(null);
<<<<<<< HEAD
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
=======
>>>>>>> 9197ee2 (vivek-showcase)

    // Fetch Campaigns
    const { data: campaigns, isLoading } = useQuery<HeroCampaign[]>({
        queryKey: ["/api/admin/hero"],
<<<<<<< HEAD
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

=======
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/admin/hero");
            return res.json();
        },
    });

    // Mutations
>>>>>>> 9197ee2 (vivek-showcase)
    const createMutation = useMutation({
        mutationFn: async (data: CampaignFormValues) => {
            const res = await apiRequest("POST", "/api/admin/hero", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/hero"] });
            setIsCreateOpen(false);
            toast({ title: "Campaign created successfully" });
            resetForm();
        },
        onError: (err: Error) => {
            toast({ title: "Failed to create campaign", description: err.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<CampaignFormValues> }) => {
            const res = await apiRequest("PUT", `/api/admin/hero/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/hero"] });
            setEditingCampaign(null);
            setIsCreateOpen(false);
            toast({ title: "Campaign updated successfully" });
            resetForm();
        },
        onError: (err: Error) => {
            toast({ title: "Failed to update campaign", description: err.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/admin/hero/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/hero"] });
            toast({ title: "Campaign deleted" });
        },
    });

    const toggleStatusMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
            const res = await apiRequest("PATCH", `/api/admin/hero/${id}/toggle`, { isActive });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/hero"] });
            toast({ title: "Status updated" });
        },
    });

    const form = useForm<CampaignFormValues>({
        resolver: zodResolver(campaignSchema),
        defaultValues: {
            name: "",
            title: "",
            subtitle: "",
            ctaLabel: "",
            ctaUrl: "",
            mediaUrl: "",
            mediaType: "image",
            contentAlignment: "left",
            overlayOpacity: "0.4",
            textColor: "#ffffff",
            titlePosX: 50,
            titlePosY: 20,
            subtitlePosX: 50,
            subtitlePosY: 40,
            ctaPosX: 50,
            ctaPosY: 60,
        },
    });

<<<<<<< HEAD
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
=======
    const onSubmit = (data: CampaignFormValues) => {
        if (editingCampaign) {
            updateMutation.mutate({ id: editingCampaign.id, data });
>>>>>>> 9197ee2 (vivek-showcase)
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (campaign: HeroCampaign) => {
        setEditingCampaign(campaign);
        form.reset({
            name: campaign.name,
            title: campaign.title,
            subtitle: campaign.subtitle,
            ctaLabel: campaign.ctaLabel,
            ctaUrl: campaign.ctaUrl,
            mediaUrl: campaign.mediaUrl,
            mediaType: campaign.mediaType as "image" | "video",
            contentAlignment: campaign.contentAlignment as "left" | "center" | "right",
            overlayOpacity: campaign.overlayOpacity.toString(),
            textColor: campaign.textColor,
<<<<<<< HEAD
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
=======
            titlePosX: campaign.titlePosX ?? 50,
            titlePosY: campaign.titlePosY ?? 20,
            subtitlePosX: campaign.subtitlePosX ?? 50,
            subtitlePosY: campaign.subtitlePosY ?? 40,
            ctaPosX: campaign.ctaPosX ?? 50,
            ctaPosY: campaign.ctaPosY ?? 60,
>>>>>>> 9197ee2 (vivek-showcase)
        });
        setIsCreateOpen(true);
    };

    const handleTemplateSelect = (values: Partial<InsertHeroCampaign>) => {
        form.reset({
            ...form.getValues(),
            ...values,
            // Ensure types match string expectations of form
            overlayOpacity: values.overlayOpacity?.toString() || "0.4",
            titlePosX: values.titlePosX || 50,
            titlePosY: values.titlePosY || 20,
            subtitlePosX: values.subtitlePosX || 50,
            subtitlePosY: values.subtitlePosY || 40,
            ctaPosX: values.ctaPosX || 50,
            ctaPosY: values.ctaPosY || 60,
        } as CampaignFormValues);
        // We stay in the form, just populated
    };

    const resetForm = () => {
        form.reset({
            name: "",
            title: "",
            subtitle: "",
            ctaLabel: "",
            ctaUrl: "",
            mediaUrl: "",
            mediaType: "image",
            contentAlignment: "left",
            overlayOpacity: "0.4",
<<<<<<< HEAD
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
=======
            textColor: "#ffffff",
            titlePosX: 50,
            titlePosY: 20,
            subtitlePosX: 50,
            subtitlePosY: 40,
            ctaPosX: 50,
            ctaPosY: 60,
>>>>>>> 9197ee2 (vivek-showcase)
        });
        setEditingCampaign(null);
    };

    const handleCreateOpenChange = (open: boolean) => {
        if (!open) resetForm();
        setIsCreateOpen(open);
    };


    if (isLoading) {
        return <div className="p-8 text-center">Loading campaigns...</div>;
    }

    return (
<<<<<<< HEAD
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
=======
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Hero Campaigns</h2>
                    <p className="text-muted-foreground">
                        Manage your homepage hero banners and promotions
                    </p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> New Campaign
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns?.map((campaign) => (
                    <Card key={campaign.id} className={`overflow-hidden transition-all ${campaign.isActive ? 'ring-2 ring-primary' : ''}`}>
                        <div className="relative aspect-video bg-muted group">
                            {campaign.mediaType === 'video' ? (
                                <video
                                    src={campaign.mediaUrl}
                                    className="object-cover w-full h-full opacity-80"
                                    muted
                                    loop
                                    playsInline
                                />
                            ) : (
                                <img
                                    src={campaign.mediaUrl}
                                    alt={campaign.name}
                                    className="object-cover w-full h-full opacity-80 transition-transform duration-500 group-hover:scale-105"
                                />
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setPreviewCampaign(campaign)}
                                    className="gap-2"
                                >
                                    <Eye className="h-4 w-4" /> Preview
                                </Button>
                            </div>
                            <div className="absolute top-2 right-2 flex gap-2">
                                <Badge variant={campaign.isActive ? "default" : "secondary"}>
                                    {campaign.isActive ? "Active" : "Inactive"}
                                </Badge>
                                <Badge variant="outline" className="bg-background/50 backdrop-blur">
                                    {campaign.type}
                                </Badge>
                            </div>
                        </div>

                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between text-lg">
                                <span className="truncate">{campaign.name}</span>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => handleEdit(campaign)}>
                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setPreviewCampaign(campaign)}>
                                            <Eye className="mr-2 h-4 w-4" /> Preview
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => toggleStatusMutation.mutate({ id: campaign.id, isActive: !campaign.isActive })}
                                        >
                                            <Power className="mr-2 h-4 w-4" />
                                            {campaign.isActive ? "Deactivate" : "Activate"}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => {
                                                if (confirm("Are you sure?")) deleteMutation.mutate(campaign.id);
                                            }}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardTitle>
                            <CardDescription className="line-clamp-1">
                                {campaign.title}
                            </CardDescription>
                        </CardHeader>

                        <CardFooter className="pt-0 text-xs text-muted-foreground flex justify-between">
                            <span>Title Pos: {campaign.titlePosX}% / {campaign.titlePosY}%</span>
                            <span>Created: {new Date(campaign.createdAt!).toLocaleDateString()}</span>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* Create/Edit Sheet */}
            <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingCampaign ? "Edit Campaign" : "Create New Campaign"}</DialogTitle>
                        <DialogDescription>
                            Configure your hero campaign appearance and content.
                        </DialogDescription>
                    </DialogHeader>

                    {!editingCampaign && (
                        <div className="mb-4 p-4 border rounded-lg bg-muted/30">
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <LayoutTemplate className="h-4 w-4" />
                                Start with a Template
                            </h4>
                            <CampaignTemplates onSelectTemplate={handleTemplateSelect} />
                        </div>
                    )}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <Tabs defaultValue="content" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="content">Content</TabsTrigger>
                                    <TabsTrigger value="media">Media & Style</TabsTrigger>
                                    <TabsTrigger value="layout">Layout & Position</TabsTrigger>
                                </TabsList>

                                <TabsContent value="content" className="space-y-4 pt-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Internal Name</FormLabel>
                                                <FormControl><Input placeholder="Summer Sale 2024" {...field} /></FormControl>
                                                <FormDescription>Used for identifying this campaign in the admin list</FormDescription>
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="title"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Headline</FormLabel>
                                                    <FormControl><Input placeholder="Big Summer Sale" {...field} /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="subtitle"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Subtitle</FormLabel>
                                                    <FormControl><Input placeholder="Up to 50% off..." {...field} value={field.value || ""} /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="ctaLabel"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Button Label</FormLabel>
                                                    <FormControl><Input placeholder="Shop Now" {...field} value={field.value || ""} /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="ctaUrl"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Button Link</FormLabel>
                                                    <FormControl><Input placeholder="/shop" {...field} value={field.value || ""} /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="media" className="space-y-4 pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="mediaType"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Media Type</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="image">Image</SelectItem>
                                                            <SelectItem value="video">Video</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="overlayOpacity"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Overlay Opacity (0-1)</FormLabel>
                                                    <FormControl><Input type="number" step="0.1" min="0" max="1" {...field} /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="mediaUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Media URL</FormLabel>
                                                <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                                                <FormDescription>Direct link to image or video</FormDescription>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="textColor"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Text Color</FormLabel>
                                                <div className="flex gap-2">
                                                    <FormControl><Input type="color" className="w-12 h-10 p-1" {...field} /></FormControl>
                                                    <Input {...field} placeholder="#ffffff" />
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </TabsContent>

                                <TabsContent value="layout" className="space-y-6 pt-4">
                                    <FormField
                                        control={form.control}
                                        name="contentAlignment"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Base Alignment</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select alignment" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="left">Left</SelectItem>
                                                        <SelectItem value="center">Center</SelectItem>
                                                        <SelectItem value="right">Right</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />

                                    <div className="space-y-6 border rounded-lg p-4">
                                        <h4 className="font-medium text-sm">Element Positioning (0-100%)</h4>
>>>>>>> 9197ee2 (vivek-showcase)

                                        <div className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="titlePosX" // Logic mismatch for combined Slider? No, need separate sliders usually or 2D. Using simple separate sliders.
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <div className="flex justify-between text-xs mb-2">
                                                            <FormLabel>Title X Position</FormLabel>
                                                            <span className="text-muted-foreground">{field.value}%</span>
                                                        </div>
                                                        <FormControl>
                                                            <Slider
                                                                min={0} max={100} step={1}
                                                                value={[field.value]}
                                                                onValueChange={(val) => field.onChange(val[0])}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="titlePosY"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <div className="flex justify-between text-xs mb-2">
                                                            <FormLabel>Title Y Position</FormLabel>
                                                            <span className="text-muted-foreground">{field.value}%</span>
                                                        </div>
                                                        <FormControl>
                                                            <Slider
                                                                min={0} max={100} step={1}
                                                                value={[field.value]}
                                                                onValueChange={(val) => field.onChange(val[0])}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="subtitlePosY"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <div className="flex justify-between text-xs mb-2">
                                                            <FormLabel>Subtitle Y Position</FormLabel>
                                                            <span className="text-muted-foreground">{field.value}%</span>
                                                        </div>
                                                        <FormControl>
                                                            <Slider
                                                                min={0} max={100} step={1}
                                                                value={[field.value]}
                                                                onValueChange={(val) => field.onChange(val[0])}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="ctaPosY"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <div className="flex justify-between text-xs mb-2">
                                                            <FormLabel>Button Y Position</FormLabel>
                                                            <span className="text-muted-foreground">{field.value}%</span>
                                                        </div>
                                                        <FormControl>
                                                            <Slider
                                                                min={0} max={100} step={1}
                                                                value={[field.value]}
                                                                onValueChange={(val) => field.onChange(val[0])}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                                        {editingCampaign ? "Update Campaign" : "Create Campaign"}
                                    </Button>
                                </TabsContent>
                            </Tabs>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Campaign Preview Dialog */}
            {previewCampaign && (
                <CampaignPreview
                    campaign={previewCampaign}
                    open={!!previewCampaign}
                    onClose={() => setPreviewCampaign(null)}
                />
            )}
        </div>
    );
}
