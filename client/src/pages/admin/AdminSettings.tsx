
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Shield, Truck, Ticket, Users } from "lucide-react";

export default function AdminSettings() {
    const settingsGroups = [
        {
            title: "System",
            items: [
                { title: "Access Control (RBAC)", href: "/admin/rbac", icon: Shield, description: "Manage roles and permissions" },
                { title: "Users", href: "/admin/users", icon: Users, description: "Manage system users" },
            ]
        },
        {
            title: "Store Configuration",
            items: [
                { title: "Shipping Rules", href: "/admin/shipping", icon: Truck, description: "Configure shipping zones and rates" },
                { title: "Coupons", href: "/admin/coupons", icon: Ticket, description: "Manage discount codes" },
            ]
        },
    ];

    return (
        <AdminLayout
            title="Settings"
            subtitle="Manage system configuration and preferences"
        >
            <div className="grid gap-6">
                {settingsGroups.map((group, index) => (
                    <div key={index} className="space-y-4">
                        <h3 className="text-lg font-medium">{group.title}</h3>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {group.items.map((item, itemIndex) => (
                                <Link key={itemIndex} href={item.href}>
                                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                                        <CardHeader>
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 rounded-md bg-primary/10 text-primary">
                                                    <item.icon className="h-5 w-5" />
                                                </div>
                                                <CardTitle className="text-base">{item.title}</CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <CardDescription>{item.description}</CardDescription>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </AdminLayout>
    );
}
