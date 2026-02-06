import { useMyTickets } from "@/hooks/use-support";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/support/TicketBadges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreateTicketModal } from "@/components/support/CreateTicketModal";
import { useState } from "react";
import { Link } from "wouter";
import { MessageSquarePlus, Clock, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default function MyTicketsPage() {
    const { data: tickets, isLoading } = useMyTickets();
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (isLoading) {
        return <div className="p-8 text-center">Loading tickets...</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Support Tickets</h1>
                    <p className="text-muted-foreground mt-1">Track and manage your support requests</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)}>
                    <MessageSquarePlus className="mr-2 h-4 w-4" />
                    Raise New Ticket
                </Button>
            </div>

            {tickets?.length === 0 ? (
                <Card className="text-center py-12">
                    <CardContent>
                        <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageSquarePlus className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No tickets found</h3>
                        <p className="text-muted-foreground mb-6">You haven't raised any support tickets yet.</p>
                        <Button onClick={() => setIsModalOpen(true)}>Raise a Ticket</Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {tickets?.map((ticket) => (
                        <Link key={ticket.id} href={`/account/tickets/${ticket.id}`}>
                            <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                                    {ticket.ticketId}
                                                </span>
                                                <TicketStatusBadge status={ticket.status} />
                                                <TicketPriorityBadge priority={ticket.priority} />
                                            </div>

                                            <h3 className="font-semibold text-lg hover:text-primary transition-colors">
                                                {ticket.subject}
                                            </h3>

                                            <p className="text-sm text-muted-foreground line-clamp-1">
                                                {ticket.description}
                                            </p>

                                            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Created: {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                                                </span>
                                                {ticket.order && (
                                                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                                        Order: {ticket.order.publicOrderId}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="self-center">
                                            <Button variant="ghost" size="sm">
                                                View Details <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            <CreateTicketModal open={isModalOpen} onOpenChange={setIsModalOpen} />
        </div>
    );
}
