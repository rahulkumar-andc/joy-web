import { useState } from "react";
import { useProfile, useUpdateProfile, useChangePassword } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/Navbar";
import { AddressBook } from "@/components/AddressBook";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, Redirect } from "wouter";
import { User, Lock, Package, Heart, Loader2, Mail, Phone, MapPin, RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

function RefundsList() {
    const { data: refunds, isLoading } = useQuery({
        queryKey: ["/api/refunds"],
        queryFn: async () => {
            const res = await fetch("/api/refunds");
            if (!res.ok) throw new Error("Failed to fetch refunds");
            return res.json();
        }
    });

    if (isLoading) return <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div>;

    if (!refunds?.length) {
        return (
            <Card>
                <CardContent className="py-8 text-center">
                    <RotateCcw className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <p className="text-muted-foreground">No refund requests found.</p>
                </CardContent>
            </Card>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending": return "bg-yellow-100 text-yellow-800";
            case "approved": return "bg-green-100 text-green-800";
            case "rejected": return "bg-red-100 text-red-800";
            case "processing": return "bg-blue-100 text-blue-800";
            case "completed": return "bg-green-100 text-green-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Refunds</CardTitle>
                <CardDescription>Track the status of your refund requests.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {refunds.map((refund: any) => (
                    <div key={refund.id} className="border rounded-lg p-4 flex flex-col md:flex-row justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">Refund #{refund.id}</span>
                                <Badge className={getStatusColor(refund.status)} variant="outline">
                                    {refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">Order #{refund.orderId} • ₹{refund.amount}</p>
                            <p className="text-sm text-muted-foreground mt-1">Reason: {refund.reason}</p>
                            {refund.adminNote && (
                                <p className="text-sm text-amber-600 mt-2 bg-amber-50 p-2 rounded">
                                    Admin Note: {refund.adminNote}
                                </p>
                            )}
                        </div>
                        <div className="text-sm text-muted-foreground self-start md:self-end">
                            {new Date(refund.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

export default function ProfilePage() {
    const { user, isLoading: authLoading } = useAuth();
    const { data: profile, isLoading: profileLoading } = useProfile();
    const updateProfile = useUpdateProfile();
    const changePassword = useChangePassword();

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Initialize form with profile data
    useState(() => {
        if (profile) {
            setName(profile.name || "");
            setPhone(profile.phone || "");
            setAddress(profile.address || "");
        }
    });

    if (authLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    if (!user) {
        return <Redirect to="/auth" />;
    }

    const handleUpdateProfile = async () => {
        await updateProfile.mutateAsync({ name, phone, address });
        setIsEditing(false);
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            return;
        }
        await changePassword.mutateAsync({ currentPassword, newPassword });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
    };

    return (
        <div className="min-h-screen bg-background font-body">
            <Navbar />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="font-display text-4xl font-bold text-primary mb-8">My Profile</h1>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardContent className="p-6">
                                <div className="text-center mb-6">
                                    <div className="w-20 h-20 mx-auto rounded-full bg-accent/10 flex items-center justify-center mb-4">
                                        <User className="w-10 h-10 text-accent" />
                                    </div>
                                    <h2 className="font-medium text-lg">{profile?.name || user.name}</h2>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>

                                <nav className="space-y-2">
                                    <Link href="/orders" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-muted transition-colors">
                                        <Package className="w-4 h-4" />
                                        <span>My Orders</span>
                                    </Link>
                                    <Link href="/wishlist" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-muted transition-colors">
                                        <Heart className="w-4 h-4" />
                                        <span>Wishlist</span>
                                    </Link>
                                </nav>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        <Tabs defaultValue="profile" className="w-full">
                            <TabsList className="mb-6">
                                <TabsTrigger value="profile" className="flex items-center gap-2">
                                    <User className="w-4 h-4" /> Profile Info
                                </TabsTrigger>
                                <TabsTrigger value="security" className="flex items-center gap-2">
                                    <Lock className="w-4 h-4" /> Security
                                </TabsTrigger>
                                <TabsTrigger value="addresses" className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" /> Addresses
                                </TabsTrigger>
                                <TabsTrigger value="refunds" className="flex items-center gap-2">
                                    <RotateCcw className="w-4 h-4" /> Refunds
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="profile">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Profile Information</CardTitle>
                                        <CardDescription>Update your personal details here.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="email" className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4" /> Email
                                                </Label>
                                                <Input id="email" value={user.email} disabled className="bg-muted" />
                                                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="name" className="flex items-center gap-2">
                                                    <User className="w-4 h-4" /> Full Name
                                                </Label>
                                                <Input
                                                    id="name"
                                                    value={isEditing ? name : (profile?.name || "")}
                                                    onChange={(e) => setName(e.target.value)}
                                                    disabled={!isEditing}
                                                    className={!isEditing ? "bg-muted" : ""}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="phone" className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4" /> Phone
                                                </Label>
                                                <Input
                                                    id="phone"
                                                    value={isEditing ? phone : (profile?.phone || "")}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    disabled={!isEditing}
                                                    placeholder="Enter phone number"
                                                    className={!isEditing ? "bg-muted" : ""}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="address" className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4" /> Address
                                            </Label>
                                            <Textarea
                                                id="address"
                                                value={isEditing ? address : (profile?.address || "")}
                                                onChange={(e) => setAddress(e.target.value)}
                                                disabled={!isEditing}
                                                placeholder="Enter your address"
                                                rows={3}
                                                className={!isEditing ? "bg-muted" : ""}
                                            />
                                        </div>
                                        <div className="flex gap-4">
                                            {isEditing ? (
                                                <>
                                                    <Button
                                                        onClick={handleUpdateProfile}
                                                        disabled={updateProfile.isPending}
                                                        className="bg-accent text-white"
                                                    >
                                                        {updateProfile.isPending ? (
                                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                                        ) : (
                                                            "Save Changes"
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setIsEditing(false);
                                                            setName(profile?.name || "");
                                                            setPhone(profile?.phone || "");
                                                            setAddress(profile?.address || "");
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button onClick={() => {
                                                    setIsEditing(true);
                                                    setName(profile?.name || "");
                                                    setPhone(profile?.phone || "");
                                                    setAddress(profile?.address || "");
                                                }}>
                                                    Edit Profile
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="security">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Change Password</CardTitle>
                                        <CardDescription>Update your password to keep your account secure.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="max-w-md space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="currentPassword">Current Password</Label>
                                                <Input
                                                    id="currentPassword"
                                                    type="password"
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    placeholder="Enter current password"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="newPassword">New Password</Label>
                                                <Input
                                                    id="newPassword"
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder="Enter new password (min 6 chars)"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                                <Input
                                                    id="confirmPassword"
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    placeholder="Confirm new password"
                                                />
                                                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                                                    <p className="text-xs text-destructive">Passwords do not match</p>
                                                )}
                                            </div>
                                            <Button
                                                onClick={handleChangePassword}
                                                disabled={changePassword.isPending || !currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 6}
                                                className="bg-accent text-white"
                                            >
                                                {changePassword.isPending ? (
                                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Changing...</>
                                                ) : (
                                                    "Change Password"
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="addresses">
                                <AddressBook />
                            </TabsContent>

                            <TabsContent value="refunds">
                                <RefundsList />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
