import { useProducts, useCreateProduct, useDeleteProduct, useUpdateProduct, useBulkImportProducts, getProductExportUrl } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useRef } from "react";
import { Trash2, Plus, Pencil, Upload, Download, Package, Layers, Image as ImageIcon, Shirt, Tag, Truck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { ImageUpload } from "@/components/ImageUpload";
import { useToast } from "@/hooks/use-toast";

// === FORM SCHEMA ===
const productFormSchema = z.object({
  // Basic Info
  name: z.string().min(2, "Name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  brand: z.string().optional(),
  price: z.string().min(1, "MRP is required"), // Maps to mrp
  salePrice: z.string().optional(), // Maps to salePrice
  stockQuantity: z.coerce.number().min(0),

  // Classification
  gender: z.enum(["Men", "Women", "Unisex", "Kids"]).optional(),
  clothingCategory: z.string().optional(),
  fitType: z.string().optional(),

  // Details
  material: z.string().optional(),
  pattern: z.string().optional(),
  fabricType: z.string().optional(),
  careInstructions: z.string().optional(),
  warranty: z.string().optional(),
  countryOfOrigin: z.string().optional(),
  returnPolicyDays: z.coerce.number().default(7),

  // Variants & Gallery
  variantSizes: z.array(z.object({
    size: z.string(),
    stock: z.coerce.number().default(0),
    priceOverride: z.string().optional(), // Input as string for easy editing
  })).optional(),

  variantColors: z.array(z.object({
    colorName: z.string(),
    colorHex: z.string().optional(),
    imageUrl: z.string().optional(),
    stock: z.coerce.number().default(0),
  })).optional(),

  galleryImages: z.array(z.object({
    imageUrl: z.string(),
    type: z.enum(["front", "back", "side", "zoom", "model", "gallery"]).default("gallery"),
  })).optional(),

  // Tags & SEO
  seasonTags: z.string().optional(), // Comma separated for input
  styleTags: z.string().optional(), // Comma separated for input
  dispatchTime: z.string().optional(),
  seoTitle: z.string().optional(),
  seoKeywords: z.string().optional(),
  slug: z.string().optional(),

  // Legacy/Helpers
  highlights: z.array(z.object({ value: z.string() })).optional(),
  specifications: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export function ProductManagement() {
  const { user, isLoading } = useAuth();
  const { data: products, isLoading: productsLoading } = useProducts();
  const createMutation = useCreateProduct();
  const deleteMutation = useDeleteProduct();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [importResult, setImportResult] = useState<{ total: number; success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMutation = useBulkImportProducts();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    importMutation.mutate(file, {
      onSuccess: (data) => {
        setImportResult(data);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      onError: (error) => {
        toast({ title: "Import Failed", description: error.message, variant: "destructive" });
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  };

  // Form setup
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "", description: "", price: "", salePrice: "", stockQuantity: 0,
      gender: "Unisex", clothingCategory: "T-shirt", fitType: "Regular Fit",
      returnPolicyDays: 7,
      variantSizes: [],
      variantColors: [],
      galleryImages: [],
      highlights: [{ value: "" }],
      specifications: [{ key: "", value: "" }],
    },
  });

  // Field Arrays
  const { fields: sizeFields, append: appendSize, remove: removeSize } = useFieldArray({ control: form.control, name: "variantSizes" });
  const { fields: colorFields, append: appendColor, remove: removeColor } = useFieldArray({ control: form.control, name: "variantColors" });
  const { fields: galleryFields, append: appendGallery, remove: removeGallery } = useFieldArray({ control: form.control, name: "galleryImages" });
  const { fields: highlightFields, append: appendHighlight, remove: removeHighlight } = useFieldArray({ control: form.control, name: "highlights" });
  const { fields: specFields, append: appendSpec, remove: removeSpec } = useFieldArray({ control: form.control, name: "specifications" });

  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  const hasAdminAccess = user?.role === 'admin' || (user as any).rbacRoles?.includes("SUPER_ADMIN");
  if (!user || !hasAdminAccess) return <div>Access Denied</div>;

  const onSubmit = (data: ProductFormValues) => {
    // Transform arrays
    const transformTags = (tags?: string) => tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [];

    const payload: any = {
      name: data.name,
      description: data.description,
      mrp: data.price,
      salePrice: data.salePrice,
      stockQuantity: data.stockQuantity,
      brand: data.brand,

      // Classification
      gender: data.gender,
      clothingCategory: data.clothingCategory,
      fitType: data.fitType,

      // Details
      material: data.material,
      fabricType: data.fabricType,
      pattern: data.pattern,
      careInstructions: data.careInstructions,
      dispatchTime: data.dispatchTime,
      warranty: data.warranty,
      countryOfOrigin: data.countryOfOrigin,
      returnPolicyDays: data.returnPolicyDays,

      // Tags
      seasonTags: transformTags(data.seasonTags),
      styleTags: transformTags(data.styleTags),

      // SEO
      seoTitle: data.seoTitle,
      seoKeywords: data.seoKeywords,
      slug: data.slug,

      // Variants
      variantSizes: data.variantSizes?.map(s => ({
        ...s,
        priceOverride: s.priceOverride ? s.priceOverride.toString() : undefined
      })),
      variantColors: data.variantColors,
      galleryImages: data.galleryImages,

      // Legacy structures
      images: data.galleryImages && data.galleryImages.length > 0
        ? data.galleryImages.map(img => img.imageUrl)
        : [],

      highlights: data.highlights?.map(h => h.value).filter(Boolean),
      specifications: data.specifications?.reduce((acc, curr) => {
        if (curr.key && curr.value) acc[curr.key] = curr.value;
        return acc;
      }, {} as any),
      categoryId: 1, // Default to 1 if not selected (needs category selection in UI if strict)
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        setIsOpen(false);
        form.reset();
        toast({ title: "Product created", description: "Product listed successfully." });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Product Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open(getProductExportUrl(), "_blank")}>
            <Download className="mr-2 w-4 h-4" /> Export
          </Button>
          <Button variant="outline" onClick={() => window.open("/api/products/template", "_blank")}>
            <Download className="mr-2 w-4 h-4" /> Template
          </Button>

          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv"
              onChange={handleFileUpload}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}>
              <Upload className="mr-2 w-4 h-4" />
              {importMutation.isPending ? "Importing..." : "Import CSV"}
            </Button>
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white"><Plus className="mr-2 w-4 h-4" /> Add Product</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[1200px] h-[90vh] p-0 overflow-hidden flex flex-col">
              <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle>Create New Product</DialogTitle>
                <DialogDescription>Add a new clothing item with variants and gallery.</DialogDescription>
              </DialogHeader>

              <ScrollArea className="flex-1 px-6 py-4">
                <Form {...form}>
                  <form id="product-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Tabs defaultValue="basic" className="w-full">
                      <TabsList className="grid w-full grid-cols-5 bg-muted/50 p-1">
                        <TabsTrigger value="basic"><Package className="w-4 h-4 mr-2" /> Basic Info</TabsTrigger>
                        <TabsTrigger value="variants"><Layers className="w-4 h-4 mr-2" /> Sizes & Colors</TabsTrigger>
                        <TabsTrigger value="images"><ImageIcon className="w-4 h-4 mr-2" /> Gallery</TabsTrigger>
                        <TabsTrigger value="details"><Shirt className="w-4 h-4 mr-2" /> Details</TabsTrigger>
                        <TabsTrigger value="seo"><Tag className="w-4 h-4 mr-2" /> SEO & Shipping</TabsTrigger>
                      </TabsList>

                      {/* TAB 1: BASIC INFO */}
                      <TabsContent value="basic" className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-6">
                          <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input placeholder="e.g. Men's Cotton T-Shirt" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="brand" render={({ field }) => (
                            <FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="Brand Name" {...field} /></FormControl></FormItem>
                          )} />
                        </div>
                        <FormField control={form.control} name="description" render={({ field }) => (
                          <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea className="min-h-[120px]" placeholder="Detailed product description..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-4 gap-4">
                          <FormField control={form.control} name="price" render={({ field }) => (
                            <FormItem><FormLabel>MRP (INR)</FormLabel><FormControl><Input type="number" placeholder="Original Price" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="salePrice" render={({ field }) => (
                            <FormItem><FormLabel>Sale Price (Optional)</FormLabel><FormControl><Input type="number" placeholder="Discounted Price" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="stockQuantity" render={({ field }) => (
                            <FormItem><FormLabel>Total Stock</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="returnPolicyDays" render={({ field }) => (
                            <FormItem><FormLabel>Return Policy (Days)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                          )} />
                        </div>
                      </TabsContent>

                      {/* TAB 2: VARIANTS */}
                      <TabsContent value="variants" className="space-y-6 pt-4">
                        {/* Sizes */}
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-lg font-medium flex items-center"><Layers className="w-4 h-4 mr-2" /> Size Variants</h3>
                              <Button type="button" size="sm" variant="outline" onClick={() => appendSize({ size: "", stock: 0 })}><Plus className="w-4 h-4 mr-1" /> Add Size</Button>
                            </div>
                            <div className="space-y-3">
                              {sizeFields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-[1fr,1fr,1fr,auto] gap-3 items-end">
                                  <FormField control={form.control} name={`variantSizes.${index}.size`} render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs">Size (S, M, L)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                  )} />
                                  <FormField control={form.control} name={`variantSizes.${index}.stock`} render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs">Stock</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                  )} />
                                  <FormField control={form.control} name={`variantSizes.${index}.priceOverride`} render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs">Price (Opt)</FormLabel><FormControl><Input type="number" placeholder="Same as base" {...field} /></FormControl></FormItem>
                                  )} />
                                  <Button type="button" variant="ghost" size="icon" onClick={() => removeSize(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                </div>
                              ))}
                              {sizeFields.length === 0 && <div className="text-sm text-muted-foreground italic">No size variants added.</div>}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Colors */}
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-lg font-medium flex items-center"><Layers className="w-4 h-4 mr-2" /> Color Variants</h3>
                              <Button type="button" size="sm" variant="outline" onClick={() => appendColor({ colorName: "", stock: 0 })}><Plus className="w-4 h-4 mr-1" /> Add Color</Button>
                            </div>
                            <div className="space-y-4">
                              {colorFields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-[auto,1fr,1fr,1fr,auto] gap-3 items-start border p-3 rounded-md">
                                  <FormField control={form.control} name={`variantColors.${index}.imageUrl`} render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <div className="w-16 h-16">
                                          <ImageUpload value={field.value} onChange={field.onChange} />
                                        </div>
                                      </FormControl>
                                    </FormItem>
                                  )} />
                                  <FormField control={form.control} name={`variantColors.${index}.colorName`} render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs">Color Name</FormLabel><FormControl><Input placeholder="e.g. Navy Blue" {...field} /></FormControl></FormItem>
                                  )} />
                                  <FormField control={form.control} name={`variantColors.${index}.colorHex`} render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs">Hex Code</FormLabel><FormControl><Input placeholder="#000000" type="color" className="h-10 w-full p-1" {...field} /></FormControl></FormItem>
                                  )} />
                                  <FormField control={form.control} name={`variantColors.${index}.stock`} render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs">Stock</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                  )} />
                                  <Button type="button" variant="ghost" size="icon" className="mt-6" onClick={() => removeColor(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                </div>
                              ))}
                              {colorFields.length === 0 && <div className="text-sm text-muted-foreground italic">No color variants added.</div>}
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* TAB 3: IMAGES */}
                      <TabsContent value="images" className="space-y-4 pt-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium">Product Gallery</h3>
                          <Button type="button" size="sm" variant="outline" onClick={() => appendGallery({ imageUrl: "", type: "gallery" })}><Plus className="w-4 h-4 mr-1" /> Add Image</Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {galleryFields.map((field, index) => (
                            <Card key={field.id} className="relative overflow-hidden group">
                              <CardContent className="p-2">
                                <FormField control={form.control} name={`galleryImages.${index}.imageUrl`} render={({ field }) => (
                                  <div className="aspect-square mb-2 bg-muted rounded-md flex items-center justify-center">
                                    <ImageUpload value={field.value} onChange={field.onChange} />
                                  </div>
                                )} />
                                <FormField control={form.control} name={`galleryImages.${index}.type`} render={({ field }) => (
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="front">Front View</SelectItem>
                                      <SelectItem value="back">Back View</SelectItem>
                                      <SelectItem value="side">Side View</SelectItem>
                                      <SelectItem value="zoom">Zoom / Detail</SelectItem>
                                      <SelectItem value="model">Model Shot</SelectItem>
                                      <SelectItem value="gallery">Gallery</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )} />
                                <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeGallery(index)}><Trash2 className="w-3 h-3" /></Button>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </TabsContent>

                      {/* TAB 4: DETAILS */}
                      <TabsContent value="details" className="space-y-4 pt-4">
                        <div className="grid grid-cols-3 gap-6">
                          <FormField control={form.control} name="gender" render={({ field }) => (
                            <FormItem><FormLabel>Gender</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Men">Men</SelectItem><SelectItem value="Women">Women</SelectItem><SelectItem value="Unisex">Unisex</SelectItem><SelectItem value="Kids">Kids</SelectItem></SelectContent></Select>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="clothingCategory" render={({ field }) => (
                            <FormItem><FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="T-shirt">T-shirt</SelectItem><SelectItem value="Shirt">Shirt</SelectItem><SelectItem value="Jeans">Jeans</SelectItem><SelectItem value="Hoodie">Hoodie</SelectItem><SelectItem value="Jacket">Jacket</SelectItem><SelectItem value="Kurta">Kurta</SelectItem><SelectItem value="Saree">Saree</SelectItem><SelectItem value="Tracksuit">Tracksuit</SelectItem></SelectContent></Select>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="fitType" render={({ field }) => (
                            <FormItem><FormLabel>Fit Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Regular Fit">Regular Fit</SelectItem><SelectItem value="Slim Fit">Slim Fit</SelectItem><SelectItem value="Oversized">Oversized</SelectItem><SelectItem value="Relaxed Fit">Relaxed Fit</SelectItem></SelectContent></Select>
                            </FormItem>
                          )} />
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-6">
                          <FormField control={form.control} name="material" render={({ field }) => (
                            <FormItem><FormLabel>Material Composition</FormLabel><FormControl><Input placeholder="e.g. 100% Cotton" {...field} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="fabricType" render={({ field }) => (
                            <FormItem><FormLabel>Fabric Type</FormLabel><FormControl><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Cotton">Cotton</SelectItem><SelectItem value="Polyester">Polyester</SelectItem><SelectItem value="Denim">Denim</SelectItem><SelectItem value="Wool">Wool</SelectItem><SelectItem value="Linen">Linen</SelectItem><SelectItem value="Blended">Blended</SelectItem></SelectContent></Select></FormControl></FormItem>
                          )} />
                        </div>
                        <FormField control={form.control} name="careInstructions" render={({ field }) => (
                          <FormItem><FormLabel>Care Instructions</FormLabel><FormControl><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Machine Wash">Machine Wash</SelectItem><SelectItem value="Hand Wash">Hand Wash</SelectItem><SelectItem value="Dry Clean">Dry Clean</SelectItem><SelectItem value="Do Not Bleach">Do Not Bleach</SelectItem></SelectContent></Select></FormControl></FormItem>
                        )} />

                        {/* Specifications */}
                        <div className="space-y-2 pt-4">
                          <div className="flex justify-between items-center"><h3 className="font-medium text-sm">Additional Specifications</h3><Button type="button" variant="outline" size="sm" onClick={() => appendSpec({ key: "", value: "" })}><Plus className="w-3 h-3 mr-1" /> Add</Button></div>
                          {specFields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-[1fr,1fr,auto] gap-2"><Input {...form.register(`specifications.${index}.key`)} placeholder="Key" /><Input {...form.register(`specifications.${index}.value`)} placeholder="Value" /><Button type="button" variant="ghost" size="icon" onClick={() => removeSpec(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button></div>
                          ))}
                        </div>
                      </TabsContent>

                      {/* TAB 5: SEO & SHIPPING */}
                      <TabsContent value="seo" className="space-y-4 pt-4">
                        <Card><CardContent className="pt-6 grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="dispatchTime" render={({ field }) => (
                            <FormItem><FormLabel>Dispatch Time</FormLabel><FormControl><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="24 hours">24 hours</SelectItem><SelectItem value="2 days">2 days</SelectItem><SelectItem value="5 days">5 days</SelectItem></SelectContent></Select></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="countryOfOrigin" render={({ field }) => (
                            <FormItem><FormLabel>Country of Origin</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                          )} />
                        </CardContent></Card>

                        <Card><CardHeader><CardTitle>SEO Settings</CardTitle></CardHeader>
                          <CardContent className="space-y-4">
                            <FormField control={form.control} name="seoTitle" render={({ field }) => (
                              <FormItem><FormLabel>SEO Title</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="seoKeywords" render={({ field }) => (
                              <FormItem><FormLabel>Keywords</FormLabel><FormControl><Input placeholder="clothing, t-shirt, mens fashion" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="slug" render={({ field }) => (
                              <FormItem><FormLabel>URL Slug</FormLabel><FormControl><Input placeholder="mens-cotton-tshirt-blue" {...field} /></FormControl></FormItem>
                            )} />
                          </CardContent>
                        </Card>

                        <Card><CardHeader><CardTitle>Tags</CardTitle></CardHeader>
                          <CardContent className="space-y-4">
                            <FormField control={form.control} name="seasonTags" render={({ field }) => (
                              <FormItem><FormLabel>Season Tags (comma separated)</FormLabel><FormControl><Input placeholder="Summer, Winter" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="styleTags" render={({ field }) => (
                              <FormItem><FormLabel>Style Tags (comma separated)</FormLabel><FormControl><Input placeholder="Casual, Streetwear" {...field} /></FormControl></FormItem>
                            )} />
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </form>
                </Form>
              </ScrollArea>

              <div className="p-4 border-t flex justify-end gap-2 bg-background">
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" form="product-form" disabled={createMutation.isPending}>{createMutation.isPending ? "Listing Product..." : "Create Product Listing"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Existing Product List */}
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Image</TableHead><TableHead>Name</TableHead><TableHead>Price</TableHead><TableHead>Stock</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {productsLoading ? <TableRow><TableCell colSpan={5} className="text-center h-24">Loading...</TableCell></TableRow> : products?.map((product: any) => (
              <TableRow key={product.id}>
                <TableCell><img src={product.images[0] || "/placeholder"} alt={product.name} className="w-10 h-10 object-cover rounded bg-muted" /></TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>₹{product.mrp}</TableCell>
                <TableCell>{product.stockQuantity}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(product.id); }} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Import Result Modal */}
      <Dialog open={!!importResult} onOpenChange={() => setImportResult(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Complete</DialogTitle>
            <DialogDescription>
              Summary of your CSV import
            </DialogDescription>
          </DialogHeader>
          {importResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-2xl font-bold">{importResult.total}</div>
                  <div className="text-xs text-muted-foreground">Total Rows</div>
                </div>
                <div className="bg-green-100 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                  <div className="text-xs text-green-600">Imported</div>
                </div>
                <div className="bg-red-100 rounded-lg p-3">
                  <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                  <div className="text-xs text-red-600">Failed</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto border rounded-md p-3 bg-red-50">
                  <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {importResult.errors.map((err, i) => (
                      <li key={i} className="border-b border-red-100 pb-1 last:border-0">{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setImportResult(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductManagement;

