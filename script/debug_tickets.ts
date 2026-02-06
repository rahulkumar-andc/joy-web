
import "dotenv/config";
import { db } from "../server/db";
import { supportTickets } from "../shared/schema";
import { desc } from "drizzle-orm";

async function checkTickets() {
    console.log("Fetching recent tickets...");
    const tickets = await db.query.supportTickets.findMany({
        orderBy: desc(supportTickets.createdAt),
        limit: 5,
        with: {
            user: true,
            assignedAgent: true
        }
    });

    console.log(`Found ${tickets.length} tickets.`);
    tickets.forEach((t: any) => {
        console.log("------------------------------------------------");
        console.log(`ID: ${t.id} | TicketID: ${t.ticketId}`);
        console.log(`Subject: ${t.subject}`);
        console.log(`Status: ${t.status}`);
        console.log(`Team: ${t.assignedTeam}`);
        console.log(`User: ${t.user?.email || 'N/A'} (ID: ${t.userId})`);
        console.log(`Agent: ${t.assignedAgent?.name || 'Unassigned'} (ID: ${t.assignedTo})`);
        console.log(`Created: ${t.createdAt}`);
    });
    process.exit(0);
}

checkTickets().catch(console.error);
