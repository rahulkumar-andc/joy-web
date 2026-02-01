import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

export default function ChatSupportPage() {
    return (
        <div className="container mx-auto px-4 py-8 h-[calc(100vh-140px)] flex flex-col max-w-3xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Live Support</h1>
                <span className="flex items-center text-sm text-green-600">
                    <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                    Online
                </span>
            </div>

            <div className="flex-1 border rounded-lg p-4 bg-muted/10 mb-4 overflow-y-auto">
                <div className="text-center text-sm text-muted-foreground my-4">
                    Today, 10:30 AM
                </div>

                <div className="flex gap-2 max-w-[80%] mb-4">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">S</div>
                    <div className="bg-muted p-3 rounded-lg rounded-tl-none">
                        <p className="text-sm">Hello! How can I help you today?</p>
                    </div>
                </div>

                <div className="flex gap-2 max-w-[80%] ml-auto flex-row-reverse mb-4">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-xs font-bold">You</div>
                    <div className="bg-primary text-primary-foreground p-3 rounded-lg rounded-tr-none">
                        <p className="text-sm">I have a question about my order.</p>
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <Input placeholder="Type a message..." className="flex-1" />
                <Button size="icon">
                    <Send className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
