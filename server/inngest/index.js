
import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";

// Create Inngest client
export const inngest = new Inngest({
    id: "Project-Management",
});

// Extract user details from Clerk
const getUserData = (data) => ({
    email: data.email_addresses?.[0]?.email_address,
    name: [data.first_name, data.last_name]
        .filter(Boolean)
        .join(" ") || "User",
    image: data.image_url || "",
});

// Sync user creation
const syncUserCreation = inngest.createFunction(
    {
        id: "sync-user-from-clerk",
        triggers: [{ event: "clerk/user.created" }],
    },
    async ({ event }) => {
        const { data } = event;
        const userData = getUserData(data);

        if (!userData.email) {
            throw new Error("User email is missing from Clerk event");
        }

        await prisma.user.upsert({
            where: { id: data.id },
            update: userData,
            create: {
                id: data.id,
                ...userData,
            },
        });
    }
);

// Sync user deletion
const syncUserDeletion = inngest.createFunction(
    {
        id: "delete-user-with-clerk",
        triggers: [{ event: "clerk/user.deleted" }],
    },
    async ({ event }) => {
        const { data } = event;

        await prisma.user.deleteMany({
            where: { id: data.id },
        });
    }
);

// Sync user updation
const syncUserUpdation = inngest.createFunction(
    {
        id: "update-user-from-clerk",
        triggers: [{ event: "clerk/user.updated" }],
    },
    async ({ event }) => {
        const { data } = event;
        const userData = getUserData(data);

        await prisma.user.update({
            where: { id: data.id },
            data: userData,
        });
    }
);

// Export all functions
export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
];
