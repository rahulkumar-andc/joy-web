import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RaiseTicketPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-3xl font-bold mb-8">Submit a Ticket</h1>

            <div className="space-y-6">
                <div className="space-y-2">
                    <Label>Topic</Label>
                    <Select>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a topic" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="order">Order Issue</SelectItem>
                            <SelectItem value="payment">Payment Issue</SelectItem>
                            <SelectItem value="account">Account Issue</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input placeholder="Brief description of the issue" />
                </div>

                <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Please provide more details..." className="h-32" />
                </div>

                <div className="space-y-2">
                    <Label>Attachments (Optional)</Label>
                    <Input type="file" />
                </div>

                <Button className="w-full">Submit Ticket</Button>
            </div>
        </div>
    );
}
