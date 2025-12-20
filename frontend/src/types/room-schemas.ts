import { z } from "zod";

export const createRoomSchema = z.object({
    name: z.string().min(3, "Room name must be at least 3 characters").max(255),
    description: z.string().optional(),
    topic: z.string().max(100).optional(),
    capacity: z.coerce.number().min(1).max(50, "Max capacity is 50"),
    is_private: z.boolean().default(false),
});

export type CreateRoomFormData = z.infer<typeof createRoomSchema>;
