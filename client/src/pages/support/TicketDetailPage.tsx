import { useParams } from "wouter";
import { useTicketDetails, useReplyTicket } from "@/hooks/use-support";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Send, User, ShieldCheck, Paperclip, PenLine } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { TicketStatusBadge } from "@/components/support/TicketBadges";
import { useAuth } from "@/hooks/use-auth";

export default function TicketDetailPage() {
    const { id } = useParams();
    const ticketId = parseInt(id || "0");
    const { data: ticket, isLoading } = useTicketDetails(ticketId);
    const replyTicket = useReplyTicket();
    const queryClient = useQueryClient();

    const [replyMessage, setReplyMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const { user } = useAuth();

    // Listen for real-time updates
    const { sendMessage } = useWebSocket({
        onMessage: (msg) => {
            if (msg.event === "TICKET_UPDATED" && msg.payload?.ticketId === ticketId) {
                queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
            }
            // Handle typing indicators
            if (msg.event === "TYPING_START" && msg.payload?.ticketId === ticketId) {
                setTypingUser(msg.payload?.userName || "Support");
            }
            if (msg.event === "TYPING_STOP" && msg.payload?.ticketId === ticketId) {
                setTypingUser(null);
            }
        }
    });

    // Send read receipt on mount
    useEffect(() => {
        if (ticket?.messages?.length && user?.id) {
            const lastMessage = ticket.messages[ticket.messages.length - 1];
            if (lastMessage && lastMessage.senderType !== "user") {
                sendMessage?.("READ_RECEIPT", {
                    ticketId,
                    messageId: lastMessage.id,
                    userId: user.id
                });
            }
        }
    }, [ticket?.messages, ticketId, user?.id, sendMessage]);

    // Handle typing status
    const handleTyping = useCallback(() => {
        // Send TYPING_START
        sendMessage?.("TYPING_START", {
            ticketId,
            userId: user?.id,
            userName: user?.name || "User"
        });

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set timeout to send TYPING_STOP
        typingTimeoutRef.current = setTimeout(() => {
            sendMessage?.("TYPING_STOP", {
                ticketId,
                userId: user?.id,
                userName: user?.name || "User"
            });
        }, 2000);
    }, [ticketId, user?.id, user?.name, sendMessage]);

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

    if (isLoading) return (
        <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );

    if (!ticket) return (
        <div className="container mx-auto px-4 py-8 text-center">
            <h2 className="text-xl font-semibold">Ticket not found</h2>
            <p className="text-muted-foreground">The ticket you are looking for does not exist or you don't have permission to view it.</p>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl flex flex-col h-[calc(100vh-100px)]">
            {/* Header */}
            <div className="flex justify-between items-start mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold mb-2 break-words">{ticket.subject}</h1>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-mono">{ticket.ticketId}</span>
                        <span>•</span>
                        <span>Opened {format(new Date(ticket.createdAt), "MMM d, yyyy")}</span>
                        <Badge variant="outline" className="ml-2">{ticket.issueType}</Badge>
                    </div>
                </div>
                <TicketStatusBadge status={ticket.status} />
            </div>

            {/* Original Problem Description */}
            <Card className="mb-6 bg-muted/20 border-dashed shrink-0">
                <CardContent className="pt-6">
                    <p className="text-sm font-medium mb-2 text-muted-foreground">Original Issue:</p>
                    <p className="whitespace-pre-wrap">{ticket.description}</p>
                </CardContent>
            </Card>

            <Separator className="mb-6 shrink-0" />

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto mb-6 pr-2 space-y-6">
                {ticket.messages?.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">
                        No messages yet. Start the conversation below.
                    </div>
                ) : (
                    ticket.messages?.map((msg: any) => {
                        // User messages originate from "user" type
                        // Admin/Agent messages originate from "agent" or "admin"
                        const isMe = msg.senderType === "user";
                        const isSystem = msg.senderType === "system";

                        if (isSystem) {
                            return (
                                <div key={msg.id} className="flex justify-center my-4">
                                    <span className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                                        {msg.message}
                                    </span>
                                </div>
                            );
                        }

                        if (msg.isInternal) return null; // Don't show internal notes to user

                        return (
                            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                <div className={`flex gap-3 max-w-[85%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                                    {/* Avatar */}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isMe ? "bg-primary text-primary-foreground" : "bg-blue-100 text-blue-700"
                                        }`}>
                                        {isMe ? <User className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                                    </div>

                                    <div className={`space-y-1 ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                                        <div className={`px-4 py-3 text-sm leading-relaxed shadow-sm rounded-2xl ${isMe
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-white border text-foreground rounded-tl-none"
                                            }`}>
                                            {msg.message}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground px-1">
                                            {isMe ? "You" : msg.sender?.name || "Support Team"} • {format(new Date(msg.createdAt), "h:mm a")}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                {/* Typing Indicator */}
                {typingUser && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                        <PenLine className="h-4 w-4" />
                        <span>{typingUser} is typing...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="shrink-0 bg-background pt-2">
                <div className="relative">
                    <Textarea
                        placeholder="Type your reply here..."
                        className="min-h-[100px] pr-12 resize-none"
                        value={replyMessage}
                        onChange={(e) => {
                            setReplyMessage(e.target.value);
                            handleTyping();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendReply();
                            }
                        }}
                    />
                    <div className="absolute bottom-3 right-3 flex gap-2">
                        <Button
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={handleSendReply}
                            disabled={!replyMessage.trim() || replyTicket.isPending}
                        >
                            {replyTicket.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                    Typically replies within 24 hours. Urgent issues? Call support.
                </p>
            </div>
        </div>
    );
}
