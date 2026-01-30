import { db } from "../db";
import { addresses, type Address, type InsertAddress } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export class AddressRepository {
    async getAddresses(userId: number): Promise<Address[]> {
        return await db.select().from(addresses).where(eq(addresses.userId, userId)).orderBy(desc(addresses.createdAt));
    }

    async create(address: InsertAddress): Promise<Address> {
        const [newAddress] = await db.insert(addresses).values(address).returning();
        return newAddress;
    }

    async delete(userId: number, addressId: number): Promise<void> {
        await db.delete(addresses).where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)));
    }
}

export const addressRepository = new AddressRepository();
