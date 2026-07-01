import { Router } from "express";
import { z } from "zod";
import { asyncRoute } from "../lib/http.js";
import {
  deleteAssistantConversation,
  createAssistantConversation,
  generateAssistantReply,
  getAssistantHistory,
  saveAssistantTurn,
  updateAssistantConversation
} from "../lib/assistant.js";

const router = Router();

const chatSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  message: z.string().min(1),
  conversationId: z.string().min(1).optional().nullable()
});

const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(80).optional()
});

const updateConversationSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  isPinned: z.boolean().optional()
});

router.get(
  "/conversations",
  asyncRoute(async (_req, res) => {
    const history = await getAssistantHistory();
    res.json({
      conversationId: history.conversationId,
      conversations: history.conversations
    });
  })
);

router.post(
  "/conversations",
  asyncRoute(async (req, res) => {
    const payload = createConversationSchema.parse(req.body ?? {});
    const conversation = await createAssistantConversation(payload.title);
    res.status(201).json(conversation);
  })
);

router.patch(
  "/conversations/:conversationId",
  asyncRoute(async (req, res) => {
    const payload = updateConversationSchema.parse(req.body ?? {});
    await updateAssistantConversation({
      conversationId: req.params.conversationId,
      title: payload.title,
      isPinned: payload.isPinned
    });
    res.status(204).end();
  })
);

router.delete(
  "/conversations/:conversationId",
  asyncRoute(async (req, res) => {
    await deleteAssistantConversation(req.params.conversationId);
    res.status(204).end();
  })
);

router.get(
  "/history",
  asyncRoute(async (_req, res) => {
    const conversationId = typeof _req.query.conversationId === "string" ? _req.query.conversationId : undefined;
    const history = await getAssistantHistory(conversationId);
    res.json(history);
  })
);

router.post(
  "/chat",
  asyncRoute(async (req, res) => {
    const payload = chatSchema.parse(req.body);
    const history = await getAssistantHistory(payload.conversationId ?? undefined);
    const userMessage = payload.message.trim();
    const priorMessages = history.messages.map((message) => ({
      role: message.role,
      content: message.content
    }));
    const response = await generateAssistantReply({
      month: payload.month,
      message: userMessage,
      history: priorMessages,
      conversationMemory: history.memorySummary
    });

    await saveAssistantTurn({
      conversationId: history.conversationId,
      month: payload.month,
      userMessage,
      reply: response
    });

    res.json({
      ...response,
      conversationId: history.conversationId
    });
  })
);

export default router;
