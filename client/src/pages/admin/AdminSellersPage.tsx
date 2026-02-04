import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminLayout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    Search,
    Check,
    X,
    Ban,
    PlayCircle,
    Eye,
    ChevronLeft,
    ChevronRight,
    Shield,
    ShieldAlert,
    ShieldCheck
} from "lucide-react";
import { format } from "date-fns";

interface Seller {
    id: number;
    shopName: string;
    businessEmail: string;
    businessPhone: string;
    status: string;
    businessType: string;
    rating: string | null;
    totalOrders: number;
    totalRevenue: string;
    createdAt: string;
}

const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    suspended: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    blacklisted: "bg-gray-900 text-white",
};

const statusIcons: Record<string, any> = {
    pending: Shield,
    approved: ShieldCheck,
    rejected: X,
    suspended: Ban,
    blacklisted: ShieldAlert,
};

export default function AdminSellersPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
    const [action, setAction] = useState<string>("");
    const [actionNote, setActionNote] = useState("");

    const { data, isLoading } = useQuery({
        queryKey: ["admin-sellers", page, statusFilter, search],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
            });
            if (statusFilter !== "all") params.set("status", statusFilter);
            if (search) params.set("search", search);

            const res = await fetch(`/api/admin/sellers?${params}`, {
                credentials: "include"
            });
            if (!res.ok) throw new Error("Failed to fetch sellers");
            return res.json();
        },
    });

    const actionMutation = useMutation({
        mutationFn: async ({ sellerId, action, note }: {
            sellerId: number;
            action: string;
            note?: string;
        }) => {
            // Extract CSRF token from cookie
            const csrfToken = document.cookie
                .split("; ")
                .find(row => row.startsWith("CSRF-TOKEN="))
                ?.split("=")[1];

            const res = await fetch(`/api/admin/sellers/${sellerId}/action`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": csrfToken || ""
                },
                credentials: "include",
                body: JSON.stringify({ action, reason: note }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to perform action");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-sellers"] });
            toast({
                title: "Action Completed",
                description: `Seller has been ${action}`,
            });
            setActionDialogOpen(false);
            setSelectedSeller(null);
            setAction("");
            setActionNote("");
        },
        onError: (error: Error) => {
            toast({
                title: "Action Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleAction = (seller: Seller, actionType: string) => {
        setSelectedSeller(seller);
        setAction(actionType);
        setActionDialogOpen(true);
    };

    const confirmAction = () => {
        if (!selectedSeller) return;
        actionMutation.mutate({
            sellerId: selectedSeller.id,
            action,
            note: actionNote,
        });
    };

    const actionLabels: Record<string, { label: string; color: string }> = {
        approve: { label: "Approve", color: "bg-green-600 hover:bg-green-700" },
        reject: { label: "Reject", color: "bg-red-600 hover:bg-red-700" },
        suspend: { label: "Suspend", color: "bg-orange-600 hover:bg-orange-700" },
        reactivate: { label: "Reactivate", color: "bg-blue-600 hover:bg-blue-700" },
        blacklist: { label: "Blacklist", color: "bg-gray-900 hover:bg-gray-800" },
    };

    if (isLoading) {
        return (
            <div className="flex bg-background h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
        );
    }

    return (
        <AdminLayout
            title="Seller Management"
            subtitle="Approve, reject, and manage sellers"
        >
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                        <Shield className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {data?.stats?.pending || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Approved</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {data?.stats?.approved || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Suspended</CardTitle>
                        <Ban className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {data?.stats?.suspended || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                        <X className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {data?.stats?.rejected || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by shop name, email, or phone..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sellers</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                                <SelectItem value="blacklisted">Blacklisted</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Sellers Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Sellers ({data?.total || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Shop Name</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Stats</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data?.sellers?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No sellers found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data?.sellers?.map((seller: Seller) => {
                                    const Icon = statusIcons[seller.status] || Shield;
                                    return (
                                        <TableRow key={seller.id}>
                                            <TableCell className="font-medium">
                                                {seller.shopName}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div>{seller.businessEmail}</div>
                                                    <div className="text-muted-foreground">{seller.businessPhone}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="capitalize">
                                                {seller.businessType}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div>{seller.totalOrders || 0} orders</div>
                                                    <div className="text-muted-foreground">
                                                        ₹{parseFloat(seller.totalRevenue || "0").toLocaleString()}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${statusColors[seller.status] || ""} flex items-center gap-1 w-fit`}>
                                                    <Icon className="h-3 w-3" />
                                                    {seller.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {format(new Date(seller.createdAt), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link href={`/admin/sellers/${seller.id}`}>
                                                        <Button variant="ghost" size="sm">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </Link>

                                                    {seller.status === "pending" && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                onClick={() => handleAction(seller, "approve")}
                                                            >
                                                                <Check className="h-4 w-4 mr-1" />
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => handleAction(seller, "reject")}
                                                            >
                                                                <X className="h-4 w-4 mr-1" />
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}

                                                    {seller.status === "approved" && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleAction(seller, "suspend")}
                                                        >
                                                            <Ban className="h-4 w-4 mr-1" />
                                                            Suspend
                                                        </Button>
                                                    )}

                                                    {seller.status === "suspended" && (
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            onClick={() => handleAction(seller, "reactivate")}
                                                        >
                                                            <PlayCircle className="h-4 w-4 mr-1" />
                                                            Reactivate
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {data?.totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                Page {page} of {data.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => p + 1)}
                                disabled={page >= data.totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Action Confirmation Dialog */}
            <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {action && actionLabels[action]?.label} Seller
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to {action} "{selectedSeller?.shopName}"?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {(action === "reject" || action === "suspend" || action === "blacklist") && (
                            <div className="space-y-2">
                                <Label htmlFor="note">
                                    Reason {action === "reject" ? "(Required)" : "(Optional)"}
                                </Label>
                                <Textarea
                                    id="note"
                                    placeholder="Provide a reason for this action..."
                                    value={actionNote}
                                    onChange={(e) => setActionNote(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className={actionLabels[action]?.color}
                            onClick={confirmAction}
                            disabled={
                                actionMutation.isPending ||
                                (action === "reject" && !actionNote)
                            }
                        >
                            {actionMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Confirm {action && actionLabels[action]?.label}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
