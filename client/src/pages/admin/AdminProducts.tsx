import { useProducts, useCreateProduct, useDeleteProduct, useUpdateProduct } from "@/hooks/use-products";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Trash2, Plus, Pencil, Upload, Download } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { ImageUpload } from "@/components/ImageUpload";
import { useToast } from "@/hooks/use-toast";

const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  price: z.string(),
  stockQuantity: z.number().default(100),
  images: z.string(), // simplified for input as single string, will array-ify
  categoryId: z.number().optional(),
});

// This component is now a child of AdminPage
export function ProductManagement() {
  const { user, isLoading } = useAuth();
  const { data: products, isLoading: productsLoading } = useProducts();
  const createMutation = useCreateProduct();
  const deleteMutation = useDeleteProduct();
  const updateMutation = useUpdateProduct();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      stockQuantity: 100,
      images: "",
    },
  });

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Access denied for non-admin users
  const hasAdminAccess = user?.role === 'admin' || (user as any).rbacRoles?.includes("SUPER_ADMIN");
  if (!user || !hasAdminAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p>You need admin privileges to view this page.</p>
        <Link href="/auth"><Button>Login as Admin</Button></Link>
      </div>
    );
  }

  const onSubmit = (data: z.infer<typeof productSchema>) => {
    // Transform simple input to match API schema
    createMutation.mutate({
      name: data.name,
      description: data.description,
      mrp: data.price, // Form field "price" maps to backend "mrp"
      stockQuantity: data.stockQuantity,
      images: [data.images],
      categoryId: 1, // hardcoded for MVP simplicity if no category select
    }, {
      onSuccess: () => {
        setIsOpen(false);
        form.reset();
        toast({ title: "Product created", description: "Product has been added successfully." });
      },
      onError: (error) => {
        toast({ title: "Creation failed", description: error.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Products</h2>

        <div className="flex items-center gap-2">
          {/* Import CSV */}
          <div>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const formData = new FormData();
                formData.append("file", file);

                try {
                  toast({ title: "Importing...", description: "Please wait." });
                  const csrfToken = document.cookie
                    .split("; ")
                    .find(row => row.startsWith("CSRF-TOKEN="))
                    ?.split("=")[1];

                  const res = await fetch("/api/products/bulk", {
                    method: "POST",
                    headers: {
                      "X-CSRF-Token": csrfToken || ""
                    },
                    body: formData,
                  });
                  const data = await res.json();

                  if (!res.ok) throw new Error(data.message || "Import failed");

                  toast({
                    title: "Import Complete",
                    description: `Imported: ${data.importedCount}, Failed: ${data.failedCount}`
                  });

                  if (data.failedCount > 0) {
                    console.error("Failed rows:", data.failedDetails);
                  }

                  window.location.reload();

                } catch (err: any) {
                  console.error(err);
                  toast({ title: "Import failed", description: err.message, variant: "destructive" });
                }
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => document.getElementById("csv-upload")?.click()}>
              <Upload className="mr-2 w-4 h-4" /> Import CSV
            </Button>
            <Button variant="outline" onClick={async () => {
              try {
                const res = await fetch("/api/products/export");
                if (!res.ok) throw new Error("Export failed");
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'products.csv';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast({ title: "Export Started", description: "Your download should begin shortly." });
              } catch (error) {
                console.error(error);
                toast({ title: "Export Failed", description: "Could not download products.", variant: "destructive" });
              }
            }}>
              <Download className="mr-2 w-4 h-4" /> Export CSV
            </Button>
          </div>

          {/* Add Product */}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white"><Plus className="mr-2 w-4 h-4" /> Add Product</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Product</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price</FormLabel>
                          <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stockQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock</FormLabel>
                          <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  {/* Image Upload / URL Toggle */}
                  <FormField
                    control={form.control}
                    name="images"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Image</FormLabel>
                        <FormControl>
                          <ImageUpload
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Product"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productsLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center h-24">Loading...</TableCell></TableRow>
            ) : products?.map((product: any) => (
              <TableRow key={product.id}>
                <TableCell>
                  <img src={product.images[0]} alt={product.name} className="w-10 h-10 object-cover rounded bg-muted" />
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>₹{product.mrp}</TableCell>
                <TableCell>{product.stockQuantity}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingProduct(product);
                      setIsEditOpen(true);
                    }}
                    className="text-primary hover:bg-primary/10"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this product?")) {
                        deleteMutation.mutate(product.id, {
                          onSuccess: () => {
                            toast({ title: "Product deleted", description: `${product.name} has been removed.` });
                          },
                          onError: (error) => {
                            toast({ title: "Delete failed", description: error.message, variant: "destructive" });
                          }
                        });
                      }
                    }}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default ProductManagement;
