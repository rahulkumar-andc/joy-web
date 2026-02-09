
import { db } from "../server/db";
import { users, supportTickets, userRoles, roles } from "../shared/schema";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function verifyState() {
    console.log("Verifying DB State...");

    // Check User
    const adminUser = await db.query.users.findFirst({
        where: eq(users.email, "super.admin.1@joy.com")
    });
    console.log("Admin User:", adminUser ? { id: adminUser.id, role: adminUser.role, email: adminUser.email } : "Not Found");

    // Check Tickets
    const tickets = await db.query.supportTickets.findMany();
    console.log("Total Tickets:", tickets.length);
    tickets.forEach(t => {
        console.log(`- ID: ${t.id}, TicketID: ${t.ticketId}, UserId: ${t.userId}, Subject: ${t.subject}`);
    });

    // Check specific Ticket 3
    const ticket3 = await db.query.supportTickets.findFirst({
        where: eq(supportTickets.id, 3)
    });
    console.log("Ticket 3:", ticket3 ? "Found" : "Not Found");

    // Check RBAC Roles
    const rbacRoles = await db
        .select({ roleName: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, 1)); // Assuming ID 1 from previous run

    console.log("RBAC Roles for User 1:", rbacRoles.map(r => r.roleName));

    process.exit(0);
}

verifyState().catch(console.error);
