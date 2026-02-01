import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HelpCenterPage() {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-4">How can we help?</h1>
                <div className="max-w-xl mx-auto relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input className="pl-10 h-12" placeholder="Search for help..." />
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                <Card className="hover:border-primary cursor-pointer transition-colors">
                    <CardHeader>
                        <CardTitle>Orders & Shipping</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Tracking, delivery estimates, cancellation.</p>
                    </CardContent>
                </Card>

                <Card className="hover:border-primary cursor-pointer transition-colors">
                    <CardHeader>
                        <CardTitle>Returns & Refunds</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Return policy, refund status, exchanges.</p>
                    </CardContent>
                </Card>

                <Card className="hover:border-primary cursor-pointer transition-colors">
                    <CardHeader>
                        <CardTitle>Account & Payments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Login issues, saved cards, wallet balance.</p>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-16 text-center">
                <h2 className="text-xl font-semibold mb-4">Still need help?</h2>
                <p className="text-muted-foreground">Our support team is available 24/7.</p>
            </div>
        </div>
    );
}
