import { useAdminTickets, useUpdateTicketStatus, useAssignTicket, useEscalateTicket, useAdminTicketAudit } from "@/hooks/use-support";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/support/TicketBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Filter, MessageSquare, AlertTriangle, CheckCircle, Clock, User } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function AdminSupportPage() {
    const [filters, setFilters] = useState({
        status: "",
        priority: "",
        search: "",
        page: 1,
    });

    const { data, isLoading } = useAdminTickets(filters);
    const tickets = data?.tickets || [];

    return (
        <div className="container mx-auto p-8 max-w-[1600px]">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Support Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Manage tickets, assign agents, and track SLAs.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatsCard title="Open Tickets" value="12" icon={MessageSquare} className="text-blue-600 bg-blue-50/50" />
                <StatsCard title="SLA Breaches" value="3" icon={AlertTriangle} className="text-red-600 bg-red-50/50" />
                <StatsCard title="Resolved Today" value="8" icon={CheckCircle} className="text-green-600 bg-green-50/50" />
                <StatsCard title="Pending Assignment" value="5" icon={User} className="text-orange-600 bg-orange-50/50" />
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div>
                            <CardTitle>Ticket Queue</CardTitle>
                            <CardDescription>Live feed of support requests.</CardDescription>
                        </div>

                        <div className="flex gap-4 items-center">
                            <div className="relative w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search tickets..."
                                    className="pl-9"
                                    value={filters.search}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                />
                            </div>

                            <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v === "ALL" ? "" : v }))}>
                                <SelectTrigger className="w-[180px]">
                                    <Filter className="mr-2 h-4 w-4" />
                                    <SelectValue placeholder="Filter Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Statuses</SelectItem>
                                    <SelectItem value="OPEN">Open</SelectItem>
                                    <SelectItem value="ASSIGNED">Assigned</SelectItem>
                                    <SelectItem value="ESCALATED">Escalated</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[140px]">Ticket ID</TableHead>
                                <TableHead>User / Subject</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Team</TableHead>
                                <TableHead>Assigned To</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24">Loading tickets...</TableCell>
                                </TableRow>
                            ) : tickets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24">No tickets found</TableCell>
                                </TableRow>
                            ) : (
                                tickets.map((ticket) => (
                                    <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50">
                                        <TableCell className="font-mono text-xs">{ticket.ticketId}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{ticket.subject}</div>
                                            <div className="text-xs text-muted-foreground">{ticket.user?.email}</div>
                                        </TableCell>
                                        <TableCell><TicketStatusBadge status={ticket.status} /></TableCell>
                                        <TableCell><TicketPriorityBadge priority={ticket.priority} /></TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="text-xs">{ticket.assignedTeam}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {ticket.assignedAgent ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-700 font-bold">
                                                        {ticket.assignedAgent.name.charAt(0)}
                                                    </div>
                                                    <span className="text-sm">{ticket.assignedAgent.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm italic">Unassigned</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {format(new Date(ticket.createdAt), "MMM d, h:mm a")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/admin/support/${ticket.id}`}>
                                                <Button variant="outline" size="sm">View</Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function StatsCard({ title, value, icon: Icon, className }: any) {
    return (
        <Card>
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <h2 className="text-2xl font-bold mt-2">{value}</h2>
                </div>
                <div className={`p-3 rounded-full ${className}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </CardContent>
        </Card>
    );
}
