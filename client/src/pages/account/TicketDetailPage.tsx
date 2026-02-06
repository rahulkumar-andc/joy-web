import { useTicketDetails, useReplyTicket } from "@/hooks/use-support";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQueryClient } from "@tanstack/react-query";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/support/TicketBadges";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Send, User, ShieldCheck, ArrowLeft, Paperclip } from "lucide-react";
import { useRoute, Link } from "wouter";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function TicketDetailPage() {
    const [, params] = useRoute("/account/tickets/:id");
    const ticketId = parseInt(params?.id || "0");
    const { data: ticket, isLoading } = useTicketDetails(ticketId);
    const replyTicket = useReplyTicket();
    const [replyMessage, setReplyMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Listen for real-time updates
    useWebSocket({
        onMessage: (msg) => {
            if (msg.event === "TICKET_UPDATED" && msg.payload?.ticketId === ticketId) {
                // Invalidate query to fetch new messages immediately
                queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });

                // Optional: Show toast if window is not focused? 
                // For now just auto-scroll happens via useEffect below
            }
        }
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [ticket?.messages]);

    const handleSendReply = () => {
        if (!replyMessage.trim()) return;

        replyTicket.mutate(
            { id: ticketId, data: { message: replyMessage } },
            {
                onSuccess: () => {
                    setReplyMessage("");
                    scrollToBottom();
                },
            }
        );
    };

    if (isLoading) return <div className="p-8 text-center">Loading conversation...</div>;
    if (!ticket) return <div className="p-8 text-center text-red-500">Ticket not found</div>;

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl h-[calc(100vh-80px)] flex flex-col">
            {/* HEADER */}
            <div className="mb-6 flex-none">
                <Link href="/account/tickets" className="text-sm text-muted-foreground hover:text-primary flex items-center mb-4">
                    <ArrowLeft className="mr-1 h-3 w-3" /> Back to Tickets
                </Link>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-2xl font-bold tracking-tight">{ticket.subject}</h1>
                                    <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded text-muted-foreground">
                                        {ticket.ticketId}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>Created {format(new Date(ticket.createdAt), "MMM d, yyyy h:mm a")}</span>
                                    {ticket.order && (
                                        <>
                                            <span>•</span>
                                            <span className="text-blue-600">Order #{ticket.order.publicOrderId}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 items-end">
                                <div className="flex gap-2">
                                    <TicketStatusBadge status={ticket.status} />
                                    <TicketPriorityBadge priority={ticket.priority} />
                                </div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                    {ticket.issueType.replace("_", " ")}
                                </div>
                            </div>
                        </div>

                        <Separator className="my-4" />

                        <p className="text-sm text-foreground/90 leading-relaxed">
                            {ticket.description}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* CHAT AREA */}
            <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border-muted">
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                    {ticket.messages.length === 0 && (
                        <div className="text-center text-muted-foreground py-8 italic">
                            No messages yet. Waiting for an agent to be assigned...
                        </div>
                    )}

                    {ticket.messages.map((msg: any) => {
                        const isAgent = msg.senderType === "agent" || msg.senderType === "admin";
                        const isSystem = msg.senderType === "system";

                        if (isSystem) {
                            return (
                                <div key={msg.id} className="flex justify-center my-4">
                                    <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full">
                                        {msg.message}
                                    </span>
                                </div>
                            );
                        }

                        return (
                            <div key={msg.id} className={`flex ${isAgent ? "justify-start" : "justify-end"}`}>
                                <div className={`flex gap-3 max-w-[80%] ${isAgent ? "flex-row" : "flex-row-reverse"}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isAgent ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-600"
                                        }`}>
                                        {isAgent ? <ShieldCheck className="h-5 w-5" /> : <User className="h-5 w-5" />}
                                    </div>

                                    <div className={`space-y-1 ${isAgent ? "items-start" : "items-end"} flex flex-col`}>
                                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${isAgent
                                            ? "bg-white border text-foreground rounded-tl-none"
                                            : "bg-primary text-primary-foreground rounded-tr-none"
                                            }`}>
                                            {msg.message}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground px-1">
                                            {isAgent ? "Support Agent" : "You"} • {format(new Date(msg.createdAt), "h:mm a")}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* INPUT AREA */}
                <div className="p-4 bg-background border-t">
                    {ticket.status === "CLOSED" ? (
                        <div className="text-center p-4 bg-muted/30 rounded-lg text-muted-foreground">
                            This ticket is closed. You can no longer reply.
                        </div>
                    ) : (
                        <div className="flex gap-4 items-end">
                            <Button variant="outline" size="icon" className="flex-shrink-0">
                                <Paperclip className="h-5 w-5 text-muted-foreground" />
                            </Button>

                            <Textarea
                                placeholder="Type your reply here..."
                                className="min-h-[60px] resize-none focus-visible:ring-1"
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendReply();
                                    }
                                }}
                            />

                            <Button
                                onClick={handleSendReply}
                                disabled={!replyMessage.trim() || replyTicket.isPending}
                                className="flex-shrink-0"
                                size="lg"
                            >
                                {replyTicket.isPending ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Send className="h-5 w-5" />
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
