import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function TicketDetailPage() {
    const { id } = useParams();

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-2xl font-bold mb-2">Issue with Product Quality</h1>
                    <p className="text-sm text-muted-foreground">Ticket #{id} • Opened Jan 30, 2026</p>
                </div>
                <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                    Open
                </div>
            </div>

            <div className="border rounded-lg p-6 mb-8 bg-muted/20">
                <p className="text-sm font-medium mb-2">You wrote:</p>
                <p>The product I received has a scratch on the back. Please assist.</p>
            </div>

            <div className="space-y-6 border-t pt-6">
                <h3 className="font-semibold">Conversation</h3>

                <div className="text-center text-muted-foreground py-8">
                    No replies yet.
                </div>

                <div className="mt-8">
                    <Textarea placeholder="Type your reply here..." className="mb-4" />
                    <Button>Send Reply</Button>
                </div>
            </div>
        </div>
    );
}
