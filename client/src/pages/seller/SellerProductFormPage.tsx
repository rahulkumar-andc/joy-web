import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SellerLayout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, ArrowLeft } from "lucide-react";
import { getCookie } from "@/lib/utils";

// Product validation schema
const productSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters").max(200),
    description: z.string().min(10, "Description must be at least 10 characters"),
    price: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Price must be a positive number"
    }),
    compareAtPrice: z.string().optional(),
    categoryId: z.number({ required_error: "Please select a category" }),
    subcategoryId: z.number().optional(),
    stockQuantity: z.number().min(0, "Stock cannot be negative"),
    sku: z.string().optional(),
    weight: z.string().optional(),
    dimensions: z.string().optional(),
    colors: z.array(z.string()).optional(),
    sizes: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    isFeatured: z.boolean().default(false),
    isActive: z.boolean().default(true),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function SellerProductFormPage() {
    const { id } = useParams();
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const isEdit = !!id;

    const [images, setImages] = useState<string[]>([]);
    const [uploadingImages, setUploadingImages] = useState(false);

    const form = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            stockQuantity: 0,
            isFeatured: false,
            isActive: true,
            colors: [],
            sizes: [],
            tags: [],
        },
    });

    const { register, handleSubmit, watch, setValue, formState: { errors } } = form;

    // Fetch categories
    const { data: categories } = useQuery({
        queryKey: ["categories"],
        queryFn: async () => {
            const res = await fetch("/api/categories");
            if (!res.ok) throw new Error("Failed to fetch categories");
            return res.json();
        },
    });

    // Fetch product if editing
    const { isLoading: productLoading } = useQuery({
        queryKey: ["seller-product", id],
        queryFn: async () => {
            const res = await fetch(`/api/seller/products/${id}`, {
                credentials: "include"
            });
            if (!res.ok) throw new Error("Failed to fetch product");
            const data = await res.json();

            // Set form values
            Object.keys(data).forEach((key) => {
                if (key in form.getValues()) {
                    setValue(key as any, data[key]);
                }
            });

            if (data.images) setImages(data.images);

            return data;
        },
        enabled: isEdit,
    });

    // Create/Update mutation
    const saveMutation = useMutation({
        mutationFn: async (data: ProductFormData) => {
            // Map frontend fields to backend schema fields
            const payload = {
                name: data.name,
                description: data.description,
                mrp: data.price, // Form field "price" maps to backend "mrp"
                salePrice: data.compareAtPrice || undefined, // Map compareAtPrice -> salePrice
                categoryId: data.categoryId,
                stockQuantity: data.stockQuantity,
                images,
                sku: data.sku,
                colors: data.colors,
                sizes: data.sizes,
                tags: data.tags,
                isFeatured: data.isFeatured,
                isActive: data.isActive,
            };

            const url = isEdit ? `/api/seller/products/${id}` : "/api/seller/products";
            const method = isEdit ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": getCookie("CSRF-TOKEN") || ""
                },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to save product");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: isEdit ? "Product Updated" : "Product Created",
                description: isEdit
                    ? "Your product has been updated successfully"
                    : "Your product has been submitted for review",
            });
            navigate("/seller/products");
        },
        onError: (error: Error) => {
            toast({
                title: "Save Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploadingImages(true);

        try {
            const formData = new FormData();
            Array.from(files).forEach((file) => {
                formData.append("images", file);
            });

            const res = await fetch("/api/upload/images", {
                method: "POST",
                body: formData,
                credentials: "include",
                headers: {
                    "X-CSRF-Token": getCookie("CSRF-TOKEN") || ""
                }
            });

            if (!res.ok) throw new Error("Failed to upload images");

            const data = await res.json();
            setImages((prev) => [...prev, ...data.urls]);

            toast({
                title: "Images Uploaded",
                description: `${data.urls.length} image(s) uploaded successfully`,
            });
        } catch (error) {
            toast({
                title: "Upload Failed",
                description: (error as Error).message,
                variant: "destructive",
            });
        } finally {
            setUploadingImages(false);
        }
    };

    const removeImage = (index: number) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
    };

    const onSubmit = (data: ProductFormData) => {
        if (images.length === 0) {
            toast({
                title: "Images Required",
                description: "Please upload at least one product image",
                variant: "destructive",
                duration: 3000
            });
            return;
        }
        saveMutation.mutate(data);
    };

    if (productLoading) {
        return (
            <SellerLayout title={isEdit ? "Edit Product" : "Add New Product"}>
                <div className="h-[50vh] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </SellerLayout>
        );
    }

    return (
        <SellerLayout
            title={isEdit ? "Edit Product" : "Add New Product"}
            subtitle={isEdit ? "Update product details" : "Create a new product listing"}
            actions={
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/seller/products")}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                        <CardDescription>Essential product details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Product Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Premium Cotton T-Shirt"
                                {...register("name")}
                            />
                            {errors.name && (
                                <p className="text-sm text-red-500">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description *</Label>
                            <Textarea
                                id="description"
                                placeholder="Detailed product description..."
                                rows={5}
                                {...register("description")}
                            />
                            {errors.description && (
                                <p className="text-sm text-red-500">{errors.description.message}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="categoryId">Category *</Label>
                                <Select
                                    value={watch("categoryId")?.toString()}
                                    onValueChange={(v) => setValue("categoryId", parseInt(v))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories?.map((cat: any) => (
                                            <SelectItem key={cat.id} value={cat.id.toString()}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.categoryId && (
                                    <p className="text-sm text-red-500">{errors.categoryId.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sku">SKU (Optional)</Label>
                                <Input
                                    id="sku"
                                    placeholder="PROD-001"
                                    {...register("sku")}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Pricing & Stock */}
                <Card>
                    <CardHeader>
                        <CardTitle>Pricing & Inventory</CardTitle>
                        <CardDescription>Set pricing and stock levels</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="price">Price (₹) *</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    placeholder="999.00"
                                    {...register("price")}
                                />
                                {errors.price && (
                                    <p className="text-sm text-red-500">{errors.price.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="compareAtPrice">Compare At Price (₹)</Label>
                                <Input
                                    id="compareAtPrice"
                                    type="number"
                                    step="0.01"
                                    placeholder="1299.00"
                                    {...register("compareAtPrice")}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="stockQuantity">Stock Quantity *</Label>
                                <Input
                                    id="stockQuantity"
                                    type="number"
                                    placeholder="100"
                                    {...register("stockQuantity", { valueAsNumber: true })}
                                />
                                {errors.stockQuantity && (
                                    <p className="text-sm text-red-500">{errors.stockQuantity.message}</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Images */}
                <Card>
                    <CardHeader>
                        <CardTitle>Product Images</CardTitle>
                        <CardDescription>Upload product photos (at least 1 required)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {images.map((img, index) => (
                                <div key={index} className="relative group">
                                    <img
                                        src={img}
                                        alt={`Product ${index + 1}`}
                                        className="w-full h-32 object-cover rounded-lg border"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => removeImage(index)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}

                            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                <span className="text-sm text-muted-foreground">
                                    {uploadingImages ? "Uploading..." : "Upload Image"}
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleImageUpload}
                                    disabled={uploadingImages}
                                />
                            </label>
                        </div>
                    </CardContent>
                </Card>

                {/* Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Product Settings</CardTitle>
                        <CardDescription>Additional settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                                <Label>Featured Product</Label>
                                <p className="text-sm text-muted-foreground">
                                    Display this product prominently
                                </p>
                            </div>
                            <Switch
                                checked={watch("isFeatured")}
                                onCheckedChange={(v) => setValue("isFeatured", v)}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                                <Label>Active</Label>
                                <p className="text-sm text-muted-foreground">
                                    Make product visible to customers
                                </p>
                            </div>
                            <Switch
                                checked={watch("isActive")}
                                onCheckedChange={(v) => setValue("isActive", v)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Submit */}
                <div className="flex gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/seller/products")}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={saveMutation.isPending}
                        className="flex-1"
                    >
                        {saveMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {isEdit ? "Update Product" : "Create Product"}
                    </Button>
                </div>
            </form>
        </SellerLayout>
    );
}
