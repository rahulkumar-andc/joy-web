import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PermissionTemplates } from "@shared/rbac-templates";
import { useToast } from "@/hooks/use-toast";
import { LayoutTemplate, Download } from "lucide-react";
import {
    useRoles,
    usePermissions,
    useUserRoles,
    usePendingApprovals,
    useUserElevations,
    useAssignRole,
    useRevokeRole,
    useApproveRequest,
    useRejectRequest,
    useRequestElevation,
    useRevokeElevation,
    useAuditLogs,
    useAuditStats,
    useRBACStats,
    useUserSearch,
    useCreatePermission,
    useUpdatePermission,
    useDeletePermission,
    useRolePermissions,
    useAssignRolePermission,
    useRemoveRolePermission,
    useCreateRole,
    useUpdateRole,
    useDeleteRole,
    useCloneRole,
    useBulkAssignRole,
    useApplyTemplate,
    useUpdateRoleHierarchy,
    Role,

    Permission,
    SearchUser,
} from "@/hooks/use-rbac";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Reorder } from "framer-motion";
import { Shield, Users, Clock, CheckCircle, XCircle, UserPlus, UserMinus, Zap, FileText, Search, AlertTriangle, BarChart3, Lock, Plus, Pencil, Trash, Copy, ArrowUpDown, GripVertical } from "lucide-react";

// Main RBAC Admin Component
export default function AdminRBAC() {
    return (
        <div className="space-y-6">
            <RBACStatsHeader />

            <Tabs defaultValue="roles" className="space-y-4">
                <TabsList className="grid w-full grid-cols-7 overflow-x-auto">
                    <TabsTrigger value="roles" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Roles
                    </TabsTrigger>
                    <TabsTrigger value="permissions" className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Permissions
                    </TabsTrigger>
                    <TabsTrigger value="users" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        User Roles
                    </TabsTrigger>
                    <TabsTrigger value="approvals" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Approvals
                    </TabsTrigger>
                    <TabsTrigger value="elevations" className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Elevations
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Audit Logs
                    </TabsTrigger>
                    <TabsTrigger value="hierarchy" className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Hierarchy
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="roles">
                    <RolesPanel />
                </TabsContent>

                <TabsContent value="permissions">
                    <PermissionsPanel />
                </TabsContent>

                <TabsContent value="users">
                    <UserRolesPanel />
                </TabsContent>

                <TabsContent value="approvals">
                    <ApprovalsPanel />
                </TabsContent>

                <TabsContent value="elevations">
                    <ElevationsPanel />
                </TabsContent>

                <TabsContent value="audit">
                    <AuditLogsPanel />
                </TabsContent>

                <TabsContent value="hierarchy">
                    <HierarchyPanel />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// RBAC Stats Header
function RBACStatsHeader() {
    const { data: stats, isLoading } = useRBACStats();

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                    <h2 className="text-2xl font-bold">Role-Based Access Control</h2>
                    <p className="text-muted-foreground">Manage roles, permissions, and user access</p>
                </div>
            </div>

            {!isLoading && stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card>
                        <CardContent className="pt-4">
                            <div className="text-2xl font-bold">{stats.roles}</div>
                            <p className="text-xs text-muted-foreground">Active Roles</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="text-2xl font-bold">{stats.permissions}</div>
                            <p className="text-xs text-muted-foreground">Permissions</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="text-2xl font-bold">{stats.activeAssignments}</div>
                            <p className="text-xs text-muted-foreground">Role Assignments</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="text-2xl font-bold text-yellow-600">{stats.pendingApprovals}</div>
                            <p className="text-xs text-muted-foreground">Pending Approvals</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="text-2xl font-bold text-orange-600">{stats.activeElevations}</div>
                            <p className="text-xs text-muted-foreground">Active Elevations</p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

// Roles Panel - List all roles
function RolesPanel() {
    const { data, isLoading } = useRoles();
    const { data: permissionsData } = usePermissions();
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [isManagePermissionsOpen, setIsManagePermissionsOpen] = useState(false);
    const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
    const cloneRole = useCloneRole();
    const { toast } = useToast();

    const handleClone = (role: Role) => {
        if (!confirm(`Create a copy of role "${role.displayName}"?`)) return;
        cloneRole.mutate(role.id, {
            onSuccess: () => {
                toast({ title: "Role cloned successfully" });
            },
            onError: (error: any) => {
                toast({ title: "Failed to clone role", description: error.message, variant: "destructive" });
            }
        });
    };


    if (isLoading) {
        return <div className="text-center py-8">Loading roles...</div>;
    }

    const roles = data?.roles || [];
    const permissionsByDomain = permissionsData?.permissions || {};

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>System Roles</CardTitle>
                    <CardDescription>Click a role to view its permissions</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Role</TableHead>
                                <TableHead>Level</TableHead>
                                <TableHead>Scope</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {roles.map((role) => (
                                <TableRow
                                    key={role.id}
                                    className={`cursor-pointer ${selectedRole?.id === role.id ? 'bg-muted' : ''}`}
                                    onClick={() => setSelectedRole(role)}
                                >
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{role.displayName}</div>
                                            <div className="text-xs text-muted-foreground">{role.name}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={role.hierarchyLevel <= 10 ? "destructive" : role.hierarchyLevel <= 30 ? "default" : "secondary"}>
                                            L{role.hierarchyLevel}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="capitalize">{role.scopeType}</TableCell>
                                    <TableCell>
                                        {role.isSystemRole ? (
                                            <Badge variant="outline">System</Badge>
                                        ) : role.isActive ? (
                                            <Badge variant="default">Active</Badge>
                                        ) : (
                                            <Badge variant="secondary">Inactive</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>
                            {selectedRole ? selectedRole.displayName : "Select a Role"}
                        </CardTitle>
                        <CardDescription>
                            {selectedRole?.description || "Click a role to view its details and permissions"}
                        </CardDescription>
                    </div>
                    {selectedRole && (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleClone(selectedRole)}
                                disabled={cloneRole.isPending}
                            >
                                <Copy className="h-4 w-4 mr-2" />
                                Clone
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsBulkAssignOpen(true)}
                            >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Assign Users
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsManagePermissionsOpen(true)}
                            >
                                <Shield className="h-4 w-4 mr-2" />
                                Manage Permissions
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    {selectedRole && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <Label className="text-muted-foreground">Hierarchy Level</Label>
                                    <p className="font-medium">{selectedRole.hierarchyLevel}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Scope Type</Label>
                                    <p className="font-medium capitalize">{selectedRole.scopeType}</p>
                                </div>
                            </div>

                            <div>
                                <Label className="text-muted-foreground">Permissions by Domain</Label>
                                <div className="mt-2 space-y-2">
                                    {Object.entries(permissionsByDomain).map(([domain, perms]) => {
                                        // Filter to only show permissions this role actually has
                                        // This requires checking against the role's permissions
                                        // But wait, permissionsByDomain contains ALL permissions?
                                        // Previous logic seemed to assume permissionsByDomain was filtered or mapped from Roles list?
                                        // Let's check how permissionsByDomain originates.
                                        // It comes from `usePermissions()` which returns ALL permissions.
                                        // That's WRONG for displaying role's permissions.
                                        // roles from `useRoles()` endpoint returns roles with permissions included?
                                        // Let's check `GET /roles` response structure.
                                        return null;
                                    })}

                                    {/* Correct logic: use a hook to fetch role permissions or rely on Role object if it contains them */}
                                    <ScrollArea className="h-[400px]">
                                        <RolePermissionsList roleId={selectedRole.id} />
                                    </ScrollArea>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedRole && (
                <RolePermissionsDialog
                    role={selectedRole}
                    open={isManagePermissionsOpen}
                    onOpenChange={setIsManagePermissionsOpen}
                />
            )}
            {selectedRole && (
                <BulkAssignDialog
                    role={selectedRole}
                    open={isBulkAssignOpen}
                    onOpenChange={setIsBulkAssignOpen}
                />
            )}
        </div>
    );
}

function RolePermissionsList({ roleId }: { roleId: number }) {
    const { data, isLoading } = useRolePermissions(roleId);

    if (isLoading) return <div className="text-sm text-muted-foreground">Loading permissions...</div>;

    const permissions = data?.permissions || [];
    if (permissions.length === 0) return <div className="text-sm text-muted-foreground">No permissions assigned</div>;

    // Group by domain
    const grouped = permissions.reduce((acc, p) => {
        if (!acc[p.domain]) acc[p.domain] = [];
        acc[p.domain].push(p);
        return acc;
    }, {} as Record<string, typeof permissions>);

    return (
        <div className="space-y-2">
            {Object.entries(grouped).map(([domain, perms]) => (
                <div key={domain} className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="mr-2 capitalize">{domain}</Badge>
                    {perms.map((p) => (
                        <Badge key={p.permissionId} variant="secondary" className="text-xs">
                            {p.action}
                        </Badge>
                    ))}
                </div>
            ))}
        </div>
    );
}

// User Roles Panel - Assign/Revoke roles
function UserRolesPanel() {
    const [userId, setUserId] = useState<string>("");
    const [selectedRoleId, setSelectedRoleId] = useState<string>("");
    const [scopeType, setScopeType] = useState<string>("global");
    const [scopeValue, setScopeValue] = useState<string>("");

    const { data: rolesData } = useRoles();
    const { data: userRolesData, isLoading, refetch } = useUserRoles(parseInt(userId) || 0);
    const assignRole = useAssignRole();
    const revokeRole = useRevokeRole();
    const { toast } = useToast();

    const handleSearch = () => {
        if (userId) refetch();
    };

    const handleAssign = async () => {
        if (!userId || !selectedRoleId) return;

        try {
            await assignRole.mutateAsync({
                userId: parseInt(userId),
                roleId: parseInt(selectedRoleId),
                scopeType,
                scopeValue: scopeValue || undefined,
            });
            toast({ title: "Role assigned successfully" });
            setSelectedRoleId("");
            setScopeValue("");
        } catch (error: any) {
            toast({ title: "Failed to assign role", description: error.message, variant: "destructive" });
        }
    };

    const handleRevoke = async (roleId: number) => {
        if (!userId) return;

        try {
            await revokeRole.mutateAsync({ userId: parseInt(userId), roleId });
            toast({ title: "Role revoked successfully" });
        } catch (error: any) {
            toast({ title: "Failed to revoke role", description: error.message, variant: "destructive" });
        }
    };

    const roles = rolesData?.roles || [];
    const userRoles = userRolesData?.roles || [];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>User Role Management</CardTitle>
                    <CardDescription>Search for a user and manage their roles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Label>User ID</Label>
                            <Input
                                type="number"
                                placeholder="Enter user ID"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button onClick={handleSearch}>Search</Button>
                        </div>
                    </div>

                    {userId && userRoles.length > 0 && (
                        <div>
                            <Label className="mb-2 block">Current Roles</Label>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Scope</TableHead>
                                        <TableHead>Granted</TableHead>
                                        <TableHead>Expires</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {userRoles.map((ur) => (
                                        <TableRow key={ur.assignmentId}>
                                            <TableCell className="font-medium">{ur.displayName}</TableCell>
                                            <TableCell>
                                                <span className="capitalize">{ur.scopeType}</span>
                                                {ur.scopeValue && <span className="text-muted-foreground"> ({ur.scopeValue})</span>}
                                            </TableCell>
                                            <TableCell>{new Date(ur.grantedAt).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                {ur.expiresAt ? (
                                                    <Badge variant="secondary">{new Date(ur.expiresAt).toLocaleDateString()}</Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">Never</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="destructive" size="sm">
                                                            <UserMinus className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Revoke Role</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to revoke {ur.displayName} from this user?
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleRevoke(ur.roleId)}>
                                                                Revoke
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {userId && (
                        <div className="border-t pt-4">
                            <Label className="mb-2 block">Assign New Role</Label>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem key={role.id} value={String(role.id)}>
                                                {role.displayName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={scopeType} onValueChange={setScopeType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="global">Global</SelectItem>
                                        <SelectItem value="vertical">Vertical</SelectItem>
                                        <SelectItem value="region">Region</SelectItem>
                                        <SelectItem value="seller">Seller</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Input
                                    placeholder="Scope value (optional)"
                                    value={scopeValue}
                                    onChange={(e) => setScopeValue(e.target.value)}
                                />

                                <Button onClick={handleAssign} disabled={!selectedRoleId || assignRole.isPending}>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Assign
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Approvals Panel - Approve/Reject pending requests
function ApprovalsPanel() {
    const { data, isLoading, refetch } = usePendingApprovals();
    const approveRequest = useApproveRequest();
    const rejectRequest = useRejectRequest();
    const [rejectReason, setRejectReason] = useState<string>("");
    const [rejectingId, setRejectingId] = useState<number | null>(null);
    const { toast } = useToast();

    const handleApprove = async (id: number) => {
        try {
            await approveRequest.mutateAsync(id);
            toast({ title: "Request approved" });
        } catch (error: any) {
            toast({ title: "Failed to approve", description: error.message, variant: "destructive" });
        }
    };

    const handleReject = async () => {
        if (!rejectingId || !rejectReason) return;

        try {
            await rejectRequest.mutateAsync({ approvalId: rejectingId, reason: rejectReason });
            toast({ title: "Request rejected" });
            setRejectingId(null);
            setRejectReason("");
        } catch (error: any) {
            toast({ title: "Failed to reject", description: error.message, variant: "destructive" });
        }
    };

    if (isLoading) {
        return <div className="text-center py-8">Loading approvals...</div>;
    }

    const approvals = data?.approvals || [];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Pending Approvals
                    {approvals.length > 0 && (
                        <Badge variant="destructive">{approvals.length}</Badge>
                    )}
                </CardTitle>
                <CardDescription>Review and process approval requests</CardDescription>
            </CardHeader>
            <CardContent>
                {approvals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No pending approvals
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Requester</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Domain</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {approvals.map((approval) => (
                                <TableRow key={approval.id}>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{approval.requesterName || `User #${approval.requesterId}`}</div>
                                            <div className="text-xs text-muted-foreground">{approval.requesterEmail}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge>{approval.action}</Badge>
                                    </TableCell>
                                    <TableCell className="capitalize">{approval.domain}</TableCell>
                                    <TableCell>
                                        <code className="text-xs bg-muted p-1 rounded">
                                            {JSON.stringify(approval.payload).slice(0, 50)}...
                                        </code>
                                    </TableCell>
                                    <TableCell>{new Date(approval.createdAt).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="default"
                                                onClick={() => handleApprove(approval.id)}
                                                disabled={approveRequest.isPending}
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                            </Button>

                                            <Dialog open={rejectingId === approval.id} onOpenChange={(open) => !open && setRejectingId(null)}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => setRejectingId(approval.id)}
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Reject Request</DialogTitle>
                                                        <DialogDescription>
                                                            Please provide a reason for rejecting this request.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <Textarea
                                                        placeholder="Rejection reason..."
                                                        value={rejectReason}
                                                        onChange={(e) => setRejectReason(e.target.value)}
                                                    />
                                                    <DialogFooter>
                                                        <Button variant="outline" onClick={() => setRejectingId(null)}>Cancel</Button>
                                                        <Button variant="destructive" onClick={handleReject} disabled={!rejectReason}>
                                                            Reject
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

// Elevations Panel - Temporary access management
function ElevationsPanel() {
    const [userId, setUserId] = useState<string>("");
    const [selectedRoleId, setSelectedRoleId] = useState<string>("");
    const [reason, setReason] = useState<string>("");
    const [durationHours, setDurationHours] = useState<string>("4");

    const { data: rolesData } = useRoles();
    const { data: elevationsData, refetch } = useUserElevations(parseInt(userId) || 0);
    const requestElevation = useRequestElevation();
    const revokeElevation = useRevokeElevation();
    const { toast } = useToast();

    const handleSearch = () => {
        if (userId) refetch();
    };

    const handleRequest = async () => {
        if (!userId || !selectedRoleId || !reason) return;

        try {
            const result = await requestElevation.mutateAsync({
                userId: parseInt(userId),
                roleId: parseInt(selectedRoleId),
                reason,
                durationHours: parseInt(durationHours),
            });

            if (result.requiresApproval) {
                toast({ title: "Elevation request submitted for approval" });
            } else {
                toast({ title: "Elevation granted", description: `Expires at ${result.expiresAt}` });
            }

            setSelectedRoleId("");
            setReason("");
            refetch();
        } catch (error: any) {
            toast({ title: "Failed to request elevation", description: error.message, variant: "destructive" });
        }
    };

    const handleRevoke = async (elevationId: number) => {
        try {
            await revokeElevation.mutateAsync({ elevationId });
            toast({ title: "Elevation revoked" });
            refetch();
        } catch (error: any) {
            toast({ title: "Failed to revoke", description: error.message, variant: "destructive" });
        }
    };

    const roles = rolesData?.roles || [];
    const elevations = elevationsData?.elevations || [];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Temporary Elevations
                    </CardTitle>
                    <CardDescription>Grant time-limited elevated access for emergencies</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Label>User ID</Label>
                            <Input
                                type="number"
                                placeholder="Enter user ID"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button onClick={handleSearch}>Search</Button>
                        </div>
                    </div>

                    {userId && elevations.length > 0 && (
                        <div>
                            <Label className="mb-2 block">Active Elevations</Label>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Scope</TableHead>
                                        <TableHead>Granted</TableHead>
                                        <TableHead>Expires</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {elevations.map((el) => (
                                        <TableRow key={el.id}>
                                            <TableCell className="font-medium">{el.displayName}</TableCell>
                                            <TableCell className="capitalize">{el.scopeType}</TableCell>
                                            <TableCell>{new Date(el.grantedAt).toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Badge variant="destructive">
                                                    {new Date(el.expiresAt).toLocaleString()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleRevoke(el.id)}
                                                >
                                                    Revoke
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {userId && (
                        <div className="border-t pt-4">
                            <Label className="mb-2 block">Request Temporary Elevation</Label>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map((role) => (
                                                <SelectItem key={role.id} value={String(role.id)}>
                                                    {role.displayName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={durationHours} onValueChange={setDurationHours}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1 hour</SelectItem>
                                            <SelectItem value="2">2 hours</SelectItem>
                                            <SelectItem value="4">4 hours</SelectItem>
                                            <SelectItem value="8">8 hours</SelectItem>
                                            <SelectItem value="12">12 hours</SelectItem>
                                            <SelectItem value="24">24 hours</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Button
                                        onClick={handleRequest}
                                        disabled={!selectedRoleId || !reason || requestElevation.isPending}
                                    >
                                        <Zap className="h-4 w-4 mr-2" />
                                        Request Elevation
                                    </Button>
                                </div>

                                <Textarea
                                    placeholder="Reason for elevation (minimum 10 characters)..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Audit Logs Panel
function AuditLogsPanel() {
    const [filters, setFilters] = useState({
        domain: "",
        action: "",
        status: "",
        page: 1,
        limit: 20,
    });

    const { data, isLoading } = useAuditLogs(filters);
    const { data: stats } = useAuditStats();

    const logs = data?.logs || [];
    const pagination = data?.pagination;

    const statusColors: Record<string, string> = {
        success: "bg-green-100 text-green-800",
        denied: "bg-red-100 text-red-800",
        error: "bg-orange-100 text-orange-800",
    };

    const handleExport = () => {
        const query = new URLSearchParams();
        if (filters.domain) query.append("domain", filters.domain);
        if (filters.action) query.append("action", filters.action);
        if (filters.status) query.append("status", filters.status);

        window.open(`/api/admin/rbac/audit-logs/export?${query.toString()}`, '_blank');
    };

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" />
                                Actions by Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4">
                                <div>
                                    <span className="text-2xl font-bold text-green-600">{stats.statusCounts.success || 0}</span>
                                    <p className="text-xs text-muted-foreground">Success</p>
                                </div>
                                <div>
                                    <span className="text-2xl font-bold text-red-600">{stats.statusCounts.denied || 0}</span>
                                    <p className="text-xs text-muted-foreground">Denied</p>
                                </div>
                                <div>
                                    <span className="text-2xl font-bold text-orange-600">{stats.statusCounts.error || 0}</span>
                                    <p className="text-xs text-muted-foreground">Error</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Activity Today</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(stats.domainCounts).map(([domain, count]) => (
                                    <Badge key={domain} variant="outline">
                                        {domain}: {count}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                Recent Denied
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {stats.recentDenied.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No denied actions</p>
                            ) : (
                                <ul className="text-xs space-y-1">
                                    {stats.recentDenied.slice(0, 3).map((log) => (
                                        <li key={log.id} className="text-muted-foreground">
                                            User #{log.actorId}: {log.domain}.{log.action}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Audit Logs
                        </CardTitle>
                        <CardDescription>View all RBAC-related actions</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Select value={filters.domain || "all"} onValueChange={(v) => setFilters({ ...filters, domain: v === "all" ? "" : v, page: 1 })}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Domains" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Domains</SelectItem>
                                <SelectItem value="roles">Roles</SelectItem>
                                <SelectItem value="users">Users</SelectItem>
                                <SelectItem value="products">Products</SelectItem>
                                <SelectItem value="orders">Orders</SelectItem>
                                <SelectItem value="refunds">Refunds</SelectItem>
                                <SelectItem value="elevation">Elevation</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v, page: 1 })}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="success">Success</SelectItem>
                                <SelectItem value="denied">Denied</SelectItem>
                                <SelectItem value="error">Error</SelectItem>
                            </SelectContent>
                        </Select>

                        <Input
                            placeholder="Filter by action..."
                            value={filters.action}
                            onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
                        />

                        <Button variant="outline" onClick={() => setFilters({ domain: "", action: "", status: "", page: 1, limit: 20 })}>
                            Clear Filters
                        </Button>
                    </div>

                    {/* Logs Table */}
                    {isLoading ? (
                        <div className="text-center py-8">Loading logs...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No audit logs found</div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Actor</TableHead>
                                        <TableHead>Domain</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Resource</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-xs">
                                                {new Date(log.createdAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <span className="font-medium">#{log.actorId || "System"}</span>
                                                    {log.actorRole && (
                                                        <Badge variant="outline" className="ml-2 text-xs">{log.actorRole}</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{log.domain}</Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">{log.action}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {log.resourceType && `${log.resourceType}:${log.resourceId}`}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={statusColors[log.status] || ""}>
                                                    {log.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            {pagination && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">
                                        Showing {logs.length} of {pagination.total} logs
                                    </span>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.page <= 1}
                                            onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
                                        >
                                            Previous
                                        </Button>
                                        <span className="text-sm py-2">
                                            Page {pagination.page} of {pagination.totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.page >= pagination.totalPages}
                                            onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// User Search Input Component (reusable)
function UserSearchInput({ onSelect }: { onSelect: (user: SearchUser) => void }) {
    const [query, setQuery] = useState("");
    const { data, isLoading } = useUserSearch(query);

    const users = data?.users || [];

    return (
        <div className="relative">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by email or name..."
                        className="pl-8"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>

            {query.length >= 2 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                    {isLoading ? (
                        <div className="p-2 text-sm text-muted-foreground">Searching...</div>
                    ) : users.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No users found</div>
                    ) : (
                        users.map((user) => (
                            <button
                                key={user.id}
                                className="w-full p-2 text-left hover:bg-muted flex justify-between items-center"
                                onClick={() => {
                                    onSelect(user);
                                    setQuery("");
                                }}
                            >
                                <div>
                                    <div className="font-medium">{user.name}</div>
                                    <div className="text-xs text-muted-foreground">{user.email}</div>
                                </div>
                                <Badge variant="outline">{user.role}</Badge>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

// Permissions Panel - Manage system permissions
function PermissionsPanel() {
    const { data, isLoading } = usePermissions();
    const deletePermission = useDeletePermission();
    const { toast } = useToast();

    // State for create/edit dialog
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPermission, setEditingPermission] = useState<Permission | null>(null);

    const handleDelete = async (id: number) => {
        try {
            await deletePermission.mutateAsync(id);
            toast({ title: "Permission deleted" });
        } catch (error: any) {
            toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
        }
    };

    if (isLoading) {
        return <div className="text-center py-8">Loading permissions...</div>;
    }

    const permissionsByDomain = data?.permissions || {};

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Permissions</CardTitle>
                    <CardDescription>Manage fine-grained access controls</CardDescription>
                </div>
                <Button onClick={() => { setEditingPermission(null); setIsDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Permission
                </Button>
            </CardHeader>
            <CardContent>
                {Object.keys(permissionsByDomain).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No permissions found</div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(permissionsByDomain).map(([domain, permissions]) => (
                            <div key={domain}>
                                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                                    <Badge variant="outline" className="text-base capitalize">{domain}</Badge>
                                </h3>
                                <div className="border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Action</TableHead>
                                                <TableHead>Resource</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {permissions.map((perm) => (
                                                <TableRow key={perm.id}>
                                                    <TableCell className="font-medium">{perm.action}</TableCell>
                                                    <TableCell>{perm.resource || <span className="text-muted-foreground">-</span>}</TableCell>
                                                    <TableCell>{perm.description || <span className="text-muted-foreground">-</span>}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => { setEditingPermission(perm); setIsDialogOpen(true); }}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                                                        <Trash className="h-4 w-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Delete Permission?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            This will remove the permission <strong>{perm.domain}.{perm.action}</strong>.
                                                                            Any roles using this permission will lose access.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleDelete(perm.id)} className="bg-destructive hover:bg-destructive/90">
                                                                            Delete
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <PermissionDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                permission={editingPermission}
            />
        </Card>
    );
}

function PermissionDialog({
    open,
    onOpenChange,
    permission
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    permission: Permission | null;
}) {
    const create = useCreatePermission();
    const update = useUpdatePermission();
    const { toast } = useToast();

    // Using simple state initialization pattern since we have useEffect to sync
    const [formData, setFormData] = useState({
        domain: "",
        action: "",
        resource: "",
        description: ""
    });

    useEffect(() => {
        if (open) {
            if (permission) {
                setFormData({
                    domain: permission.domain,
                    action: permission.action,
                    resource: permission.resource || "",
                    description: permission.description || ""
                });
            } else {
                setFormData({ domain: "", action: "", resource: "", description: "" });
            }
        }
    }, [open, permission]);

    const handleSubmit = async () => {
        try {
            const payload = {
                domain: formData.domain,
                action: formData.action,
                resource: formData.resource || null,
                description: formData.description || null
            };

            if (permission) {
                await update.mutateAsync({ ...payload, id: permission.id });
                toast({ title: "Permission updated" });
            } else {
                await create.mutateAsync(payload);
                toast({ title: "Permission created" });
            }
            onOpenChange(false);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{permission ? "Edit Permission" : "New Permission"}</DialogTitle>
                    <DialogDescription>
                        Define the domain, action, and optional resource for this permission.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Domain</Label>
                            <Input
                                placeholder="e.g. orders"
                                value={formData.domain}
                                onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Action</Label>
                            <Input
                                placeholder="e.g. create"
                                value={formData.action}
                                onChange={(e) => setFormData(prev => ({ ...prev, action: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Resource (Optional)</Label>
                        <Input
                            placeholder="Specific resource identifier"
                            value={formData.resource}
                            onChange={(e) => setFormData(prev => ({ ...prev, resource: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                            placeholder="What does this permission allow?"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!formData.domain || !formData.action || create.isPending || update.isPending}
                    >
                        {permission ? "Update" : "Create"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function RolePermissionsDialog({
    role,
    open,
    onOpenChange
}: {
    role: Role;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { data: allPermissionsData } = usePermissions();
    const { data: rolePermissionsData, isLoading: isLoadingRolePerms } = useRolePermissions(role.id);

    const assignPermission = useAssignRolePermission();
    const removePermission = useRemoveRolePermission();
    const applyTemplate = useApplyTemplate();
    const { toast } = useToast();

    if (!allPermissionsData) return null;

    const allPermissions = allPermissionsData.permissions || {};
    const rolePermissions = rolePermissionsData?.permissions || [];
    const rolePermissionIds = new Set(rolePermissions.map(p => p.permissionId));

    const handleToggle = async (permissionId: number, checked: boolean) => {
        try {
            if (checked) {
                await assignPermission.mutateAsync({
                    roleId: role.id,
                    permissionId
                });
            } else {
                await removePermission.mutateAsync({
                    roleId: role.id,
                    permissionId
                });
            }
        } catch (error: any) {
            toast({
                title: "Failed to update permission",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleApplyTemplate = async (template: typeof PermissionTemplates[number]) => {
        if (!confirm(`Apply template "${template.name}" to role "${role.displayName}"? This will add permissions.`)) return;

        try {
            await applyTemplate.mutateAsync({
                roleId: role.id,
                templateId: template.id
            });
            toast({ title: "Template applied successfully" });
        } catch (error: any) {
            toast({ title: "Failed to apply template", description: error.message, variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle>Manage Permissions: {role.displayName}</DialogTitle>
                            <DialogDescription>
                                Assign or remove permissions for this role. Changes save immediately.
                            </DialogDescription>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <LayoutTemplate className="h-4 w-4 mr-2" />
                                    Templates
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Apply Template</DropdownMenuLabel>
                                {PermissionTemplates.map(template => (
                                    <DropdownMenuItem
                                        key={template.id}
                                        onClick={() => handleApplyTemplate(template)}
                                    >
                                        <div className="flex flex-col">
                                            <span>{template.name}</span>
                                            <span className="text-xs text-muted-foreground">{template.description}</span>
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-6">
                        {Object.entries(allPermissions).map(([domain, permissions]) => (
                            <div key={domain}>
                                <h4 className="text-sm font-medium mb-3 flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
                                    <Badge variant="outline" className="text-base capitalize">{domain}</Badge>
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {permissions.map((perm) => {
                                        const isAssigned = rolePermissionIds.has(perm.id);
                                        const isPending = assignPermission.isPending || removePermission.isPending;

                                        return (
                                            <div key={perm.id} className="flex items-start gap-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                                                <Checkbox
                                                    id={`perm-${perm.id}`}
                                                    checked={isAssigned}
                                                    onCheckedChange={(checked) => handleToggle(perm.id, checked as boolean)}
                                                    disabled={isPending}
                                                />
                                                <div className="grid gap-1.5 leading-none">
                                                    <label
                                                        htmlFor={`perm-${perm.id}`}
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                    >
                                                        {perm.action}
                                                    </label>
                                                    <p className="text-xs text-muted-foreground">
                                                        {perm.description || "No description"}
                                                        {perm.resource && <span className="block mt-1 font-mono text-[10px] bg-muted/50 px-1 py-0.5 rounded w-fit">{perm.resource}</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function BulkAssignDialog({
    role,
    open,
    onOpenChange
}: {
    role: Role;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([]);
    const bulkAssign = useBulkAssignRole();
    const { toast } = useToast();

    const handleAssign = () => {
        if (selectedUsers.length === 0) return;

        bulkAssign.mutate({
            roleId: role.id,
            userIds: selectedUsers.map(u => u.id)
        }, {
            onSuccess: (data: any) => {
                toast({
                    title: "Assignments Complete",
                    description: `Successfully assigned ${data.attached} users. Skipped ${data.skipped}.`
                });
                onOpenChange(false);
                setSelectedUsers([]);
            },
            onError: (error: any) => {
                toast({ title: "Failed to assign", description: error.message, variant: "destructive" });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Bulk Assign Users</DialogTitle>
                    <DialogDescription>
                        Assign <strong>{role.displayName}</strong> to multiple users at once.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <UserSearchInput onSelect={(user) => {
                        if (!selectedUsers.find(u => u.id === user.id)) {
                            setSelectedUsers([...selectedUsers, user]);
                        }
                    }} />

                    {selectedUsers.length > 0 && (
                        <div className="space-y-2">
                            <Label>Selected Users ({selectedUsers.length})</Label>
                            <ScrollArea className="h-32 border rounded-md p-2">
                                <div className="space-y-1">
                                    {selectedUsers.map(user => (
                                        <div key={user.id} className="flex items-center justify-between text-sm p-1 hover:bg-muted rounded">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{user.name}</span>
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => setSelectedUsers(selectedUsers.filter(u => u.id !== user.id))}
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleAssign}
                        disabled={selectedUsers.length === 0 || bulkAssign.isPending}
                    >
                        {bulkAssign.isPending ? "Assigning..." : `Assign ${selectedUsers.length} Users`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}



// Hierarchy Panel
function HierarchyPanel() {
    const { toast } = useToast();
    const { data } = useRoles();
    const roles = data?.roles || [];
    const { mutate: updateHierarchy, isPending } = useUpdateRoleHierarchy();
    const [orderedRoles, setOrderedRoles] = useState(roles);

    // Sync roles when data changes (initial load)
    useEffect(() => {
        // Sort by hierarchyLevel desc
        const sorted = [...roles].sort((a, b) => (b.hierarchyLevel || 0) - (a.hierarchyLevel || 0));
        setOrderedRoles(sorted);
    }, [data]); // Changed dependency to data (or roles derived from it)

    const handleSave = () => {
        const ids = orderedRoles.map(r => r.id);
        updateHierarchy(ids, {
            onSuccess: () => {
                toast({ title: "Hierarchy updated successfully" });
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Role Hierarchy</h3>
                    <p className="text-sm text-muted-foreground">
                        Drag roles to reorder. Roles higher in the list have higher authority.
                    </p>
                </div>
                <Button onClick={handleSave} disabled={isPending}>
                    {isPending ? "Saving..." : "Save Order"}
                </Button>
            </div>

            <Reorder.Group axis="y" values={orderedRoles} onReorder={setOrderedRoles} className="space-y-2">
                {orderedRoles.map((role) => (
                    <Reorder.Item key={role.id} value={role}>
                        <Card className="cursor-grab active:cursor-grabbing hover:bg-accent/50 bg-card">
                            <CardContent className="p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                                    <div className="flex flex-col">
                                        <span className="font-medium flex items-center gap-2">
                                            {role.displayName}
                                            {role.isSystemRole && <Badge variant="secondary" className="text-[10px]">System</Badge>}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            Current Level: {role.hierarchyLevel || 0}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-muted-foreground">
                                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                                </div>
                            </CardContent>
                        </Card>
                    </Reorder.Item>
                ))}
            </Reorder.Group>
        </div>
    );
}
