import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncRoute } from "../lib/http.js";
import { ensureWorkspaceProfile } from "../lib/workspace.js";
import { serializeClient } from "../lib/serializers.js";
import { AppError } from "../lib/errors.js";

const router = Router();

const clientSchema = z.object({
  name: z.string().min(1),
  legalName: z.string().nullable().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().nullable().optional(),
  postalCode: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  vatNumber: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  contactName: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

router.get(
  "/",
  asyncRoute(async (_req, res) => {
    const profile = await ensureWorkspaceProfile();
    const clients = await prisma.client.findMany({
      where: { userProfileId: profile.id },
      orderBy: { createdAt: "desc" }
    });
    res.json(clients.map(serializeClient));
  })
);

router.post(
  "/",
  asyncRoute(async (req, res) => {
    const profile = await ensureWorkspaceProfile();
    const payload = clientSchema.parse(req.body);
    const client = await prisma.client.create({
      data: {
        userProfileId: profile.id,
        ...payload,
        addressLine2: payload.addressLine2 ?? null,
        vatNumber: payload.vatNumber ?? null,
        email: payload.email ?? null,
        contactName: payload.contactName ?? null,
        notes: payload.notes ?? null
      }
    });
    res.status(201).json(serializeClient(client));
  })
);

router.get(
  "/:id",
  asyncRoute(async (req, res) => {
    const client = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!client) {
      throw new AppError(404, "Client not found");
    }
    res.json(serializeClient(client));
  })
);

router.put(
  "/:id",
  asyncRoute(async (req, res) => {
    const payload = clientSchema.parse(req.body);
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        ...payload,
        addressLine2: payload.addressLine2 ?? null,
        vatNumber: payload.vatNumber ?? null,
        email: payload.email ?? null,
        contactName: payload.contactName ?? null,
        notes: payload.notes ?? null
      }
    });
    res.json(serializeClient(client));
  })
);

router.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;
