import { useTicketDetails, useReplyTicket, useUpdateTicketStatus, useEscalateTicket, useAssignTicket, useAdminTicketAudit } from "@/hooks/use-support";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQueryClient } from "@tanstack/react-query";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/support/TicketBadges";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, User, ShieldCheck, ArrowLeft, Paperclip, Lock, History } from "lucide-react";
import { useRoute, Link } from "wouter";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function AdminTicketDetailPage() {
    const [, params] = useRoute("/admin/support/:id");
    const ticketId = parseInt(params?.id || "0");
    const { data: ticket, isLoading } = useTicketDetails(ticketId);
    const { data: auditLogs } = useAdminTicketAudit(ticketId);
    const replyTicket = useReplyTicket();
    const updateStatus = useUpdateTicketStatus();
    const escalateTicket = useEscalateTicket();
    const queryClient = useQueryClient();

    // Listen for real-time updates (Admin Side)
    useWebSocket({
        onMessage: (msg) => {
            if (msg.event === "TICKET_UPDATED" && msg.payload?.ticketId === ticketId) {
                // Invalidate ticket details and audit logs
                queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
                queryClient.invalidateQueries({ queryKey: ["ticket-audit", ticketId] });
            }
        }
    });

    const [replyMessage, setReplyMessage] = useState("");
    const [isInternal, setIsInternal] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [ticket?.messages]);

    const handleSendReply = () => {
        if (!replyMessage.trim()) return;

        replyTicket.mutate(
            { id: ticketId, data: { message: replyMessage, isInternal } },
            {
                onSuccess: () => {
                    setReplyMessage("");
                    setIsInternal(false);
                    scrollToBottom();
                },
            }
        );
    };

    if (isLoading) return <div className="p-8 text-center">Loading ticket...</div>;
    if (!ticket) return <div className="p-8 text-center">Ticket not found</div>;

    return (
        <div className="container mx-auto p-6 max-w-[1600px] h-[calc(100vh-40px)] flex flex-col">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin/support">
                        <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            {ticket.ticketId}
                            <TicketStatusBadge status={ticket.status} />
                            <TicketPriorityBadge priority={ticket.priority} />
                        </h1>
                        <p className="text-muted-foreground">{ticket.subject}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Select
                        defaultValue={ticket.status}
                        onValueChange={(v) => updateStatus.mutate({ id: ticket.id, status: v })}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Change Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="WAITING_FOR_CUSTOMER">Waiting For Customer</SelectItem>
                            <SelectItem value="RESOLVED">Resolved</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="destructive" onClick={() => escalateTicket.mutate({ id: ticket.id, reason: "Admin manual escalation" })}>
                        Escalate
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6 flex-1 overflow-hidden">

                {/* LEFT: CHAT */}
                <div className="col-span-8 flex flex-col h-full bg-white rounded-lg border shadow-sm overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                        {ticket.messages?.map((msg: any) => {
                            const isInternalMsg = msg.isInternal;
                            const isAgent = msg.senderType === "agent" || msg.senderType === "admin";

                            return (
                                <div key={msg.id} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
                                    <div className={`flex gap-3 max-w-[85%] ${isAgent ? "flex-row-reverse" : "flex-row"}`}>
                                        {/* Avatar */}
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isAgent ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                                            }`}>
                                            {isAgent ? <ShieldCheck className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                        </div>

                                        <div className={`space-y-1 ${isAgent ? "items-end" : "items-start"} flex flex-col`}>
                                            {/* Bubble */}
                                            <div className={`px-4 py-3 text-sm leading-relaxed shadow-sm relative ${isInternalMsg
                                                ? "bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl"
                                                : isAgent
                                                    ? "bg-blue-600 text-white rounded-2xl rounded-tr-none"
                                                    : "bg-white border text-foreground rounded-2xl rounded-tl-none"
                                                }`}>
                                                {isInternalMsg && (
                                                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1 opacity-75">
                                                        <Lock className="h-3 w-3" /> Internal Note
                                                    </div>
                                                )}
                                                {msg.message}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground px-1">
                                                {msg.sender?.name || (isAgent ? "Agent" : "User")} • {format(new Date(msg.createdAt), "h:mm a")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* INPUT */}
                    <div className="p-4 border-t bg-white">
                        <div className="flex items-center gap-2 mb-2">
                            <Tabs value={isInternal ? "note" : "reply"} onValueChange={(v) => setIsInternal(v === "note")} className="w-full">
                                <TabsList className="grid w-[300px] grid-cols-2">
                                    <TabsTrigger value="reply">Public Reply</TabsTrigger>
                                    <TabsTrigger value="note" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900">
                                        <Lock className="w-3 h-3 mr-2" /> Internal Note
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                        <div className={`rounded-lg border p-2 ${isInternal ? "bg-amber-50/50 border-amber-200" : "bg-white"}`}>
                            <Textarea
                                placeholder={isInternal ? "Add a private note for other agents..." : "Type reply to customer..."}
                                className="min-h-[80px] resize-none border-0 focus-visible:ring-0 bg-transparent shadow-none"
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                            />
                            <div className="flex justify-between items-center pt-2 px-1">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                                </Button>
                                <Button
                                    onClick={handleSendReply}
                                    disabled={!replyMessage.trim() || replyTicket.isPending}
                                    className={isInternal ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
                                >
                                    {isInternal ? "Save Note" : "Send Reply"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: INFO SIDEBAR */}
                <div className="col-span-4 space-y-6 overflow-y-auto pr-2">

                    {/* USER INFO */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Customer</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                    <User className="h-5 w-5 text-slate-500" />
                                </div>
                                <div>
                                    <div className="font-semibold">{ticket.user?.name}</div>
                                    <div className="text-xs text-muted-foreground">{ticket.user?.email}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* TICKET INFO */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Ticket Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Issue Type</span>
                                <span className="font-medium">{ticket.issueType}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Created</span>
                                <span className="font-medium">{format(new Date(ticket.createdAt), "MMM d, h:mm a")}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Team</span>
                                <span className="font-medium">{ticket.assignedTeam}</span>
                            </div>
                            <Separator />
                            {ticket.order && (
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Related Order</div>
                                    <Link href={`/admin/orders/${ticket.orderId}`} className="text-blue-600 hover:underline font-medium block">
                                        #{ticket.order.publicOrderId}
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* AUDIT LOG */}
                    <Card className="flex-1">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <History className="h-4 w-4" /> Activity Log
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 relative pl-4 border-l">
                                {auditLogs?.map((log: any) => (
                                    <div key={log.id} className="relative text-xs">
                                        <div className="absolute -left-[21px] top-0 w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
                                        <div className="font-medium">{log.actionType.replace("_", " ")}</div>
                                        <div className="text-muted-foreground mb-1">
                                            {log.performedBy ? `by User #${log.performedBy}` : 'System'}
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                            {format(new Date(log.createdAt), "MMM d, h:mm a")}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
