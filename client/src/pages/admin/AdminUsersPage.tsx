import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    Search,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    UserCheck,
    UserX,
    Shield,
    Eye
} from "lucide-react";
import { format } from "date-fns";

export default function AdminUsersPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");

    // Fetch Users
    const { data, isLoading } = useQuery({
        queryKey: ["admin-users", page, roleFilter, search],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
            });
            if (roleFilter !== "all") params.set("role", roleFilter);
            if (search) params.set("search", search);

            const res = await fetch(`/api/admin/users?${params}`, {
                credentials: "include"
            });
            if (!res.ok) throw new Error("Failed to fetch users");
            return res.json();
        },
    });

    const mutation = useMutation({
        mutationFn: async ({ id, role, isVerified }: { id: number; role?: string; isVerified?: boolean }) => {
            const res = await fetch(`/api/admin/users/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ role, isVerified }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Update failed");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            toast({ title: "Success", description: "User updated successfully" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    if (isLoading) {
        return (
            <AdminLayout title="Users" subtitle="Manager platform users">
                <div className="flex h-60 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout
            title="Users Management"
            subtitle="View and manage customer and seller accounts"
        >
            {/* KPI Section could be added here */}

            {/* Filters */}
            <Card className="mb-6">
                <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by Name, Email or Phone..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filter by Role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="seller">Seller</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Users ({data?.total || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data?.users?.map((user: any) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{user.name}</span>
                                            <span className="text-xs text-muted-foreground">{user.email || user.username}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'seller' ? 'default' : 'secondary'}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.isVerified ? 'outline' : 'secondary'} className={user.isVerified ? "bg-green-50 text-green-700 border-green-200" : ""}>
                                            {user.isVerified ? "Verified" : "Unverified"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(user.createdAt), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id.toString())}>
                                                    Copy User ID
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <a href={`/admin/users/${user.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" /> View Details
                                                    </a>
                                                </DropdownMenuItem>

                                                {user.role !== 'admin' && (
                                                    <DropdownMenuItem onClick={() => mutation.mutate({ id: user.id, role: 'admin' })}>
                                                        <Shield className="mr-2 h-4 w-4" /> Promote to Admin
                                                    </DropdownMenuItem>
                                                )}

                                                {user.role === 'user' && !user.isVerified && (
                                                    <DropdownMenuItem onClick={() => mutation.mutate({ id: user.id, isVerified: true })}>
                                                        <UserCheck className="mr-2 h-4 w-4" /> Verify User
                                                    </DropdownMenuItem>
                                                )}

                                                {user.isVerified && (
                                                    <DropdownMenuItem onClick={() => mutation.mutate({ id: user.id, isVerified: false })} className="text-red-600">
                                                        <UserX className="mr-2 h-4 w-4" /> Revoke Verification
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {data?.total > 20 && (
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
                                Page {page} of {Math.ceil(data.total / 20)}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => p + 1)}
                                disabled={page >= Math.ceil(data.total / 20)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </AdminLayout>
    );
}
