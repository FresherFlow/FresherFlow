import express, { Request, Response, NextFunction, Router } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.REDIS_ENABLED = "false";

const prismaMock = {
  opportunity: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const trackMock = vi.fn();

vi.mock("@fresherflow/database", () => ({
  prisma: prismaMock,
  OpportunityStatus: { PUBLISHED: "PUBLISHED" },
}));

vi.mock("../infrastructure/services/event.service", () => ({
  eventService: { track: trackMock },
}));

let app: express.Application;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("../routes/public/opportunities/clicks");
  const router = (mod.default ?? mod) as Router;
  app = express();
  app.use(express.json());
  // Mirror production: mounted under /api/opportunities with optionalAuth.
  app.use(
    "/api/opportunities",
    (req: Request, _res: Response, next: NextFunction) => {
      (req as Request & { userId?: string }).userId = "user-1";
      next();
    },
    router,
  );
  app.use(
    (
      err: Error & { statusCode?: number },
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      res
        .status(err.statusCode || 500)
        .json({ success: false, message: err.message });
    },
  );
});

describe("POST /api/opportunities/:id/click (apply funnel)", () => {
  it("increments engagement and emits CLICK_APPLY for a published opportunity", async () => {
    prismaMock.opportunity.findFirst.mockResolvedValue({ id: "opp-1" });
    prismaMock.opportunity.findUnique.mockResolvedValue({
      sharesCount: 0,
      savesCount: 0,
      clicksCount: 4,
      postedAt: new Date(),
      linkHealth: "HEALTHY",
    });
    prismaMock.opportunity.update.mockResolvedValue({});

    const res = await request(app)
      .post("/api/opportunities/opp-1/click")
      .send({ source: "opportunity_detail", sessionId: "sess_123" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    // Engagement counter incremented from 4 -> 5.
    expect(prismaMock.opportunity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "opp-1" },
        data: expect.objectContaining({ clicksCount: 5 }),
      }),
    );

    // The funnel event records the real source and session, not 'unknown'.
    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CLICK_APPLY",
        opportunityId: "opp-1",
        userId: "user-1",
        sessionId: "sess_123",
        source: "opportunity_detail",
      }),
    );
  });

  it("prefers the x-platform header when the body omits source", async () => {
    prismaMock.opportunity.findFirst.mockResolvedValue({ id: "opp-2" });
    prismaMock.opportunity.findUnique.mockResolvedValue({
      sharesCount: 0,
      savesCount: 0,
      clicksCount: 0,
      postedAt: new Date(),
      linkHealth: "HEALTHY",
    });
    prismaMock.opportunity.update.mockResolvedValue({});

    const res = await request(app)
      .post("/api/opportunities/opp-2/click")
      .set("x-platform", "mobile_feed")
      .send({});

    expect(res.status).toBe(200);
    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({ source: "mobile_feed" }),
    );
  });

  it("returns 404 for an unknown opportunity and records nothing", async () => {
    prismaMock.opportunity.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/opportunities/missing/click")
      .send({});

    expect(res.status).toBe(404);
    expect(prismaMock.opportunity.update).not.toHaveBeenCalled();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed opportunity id", async () => {
    const res = await request(app)
      .post("/api/opportunities/not%20valid*/click")
      .send({});

    expect(res.status).toBe(400);
    expect(trackMock).not.toHaveBeenCalled();
  });
});
