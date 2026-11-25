import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";


export async function GET() {
  const startTime = Date.now();
  let dbStatus = "disconnected";
  let dbLatencyMs: number | null = null;
  let isHealthy = false;

  try {
    await connectDB();
    const readyState = mongoose.connection.readyState;

    if (readyState === 1 && mongoose.connection.db) {
      const pingStart = Date.now();
      await mongoose.connection.db.admin().ping();
      dbLatencyMs = Date.now() - pingStart;
      dbStatus = "connected";
      isHealthy = true;
    } else {
      dbStatus = readyState === 2 ? "connecting" : "disconnected";
    }
  } catch {
    dbStatus = "error";
  }

  const mem = process.memoryUsage();
  const toMB = (bytes: number) => `${Math.round(bytes / 1024 / 1024)}MB`;

  const payload = {
    status: isHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    responseTimeMs: Date.now() - startTime,
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
    system: {
      nodeVersion: process.version,
      memory: {
        rss: toMB(mem.rss),
        heapUsed: toMB(mem.heapUsed),
        heapTotal: toMB(mem.heapTotal),
      },
    },
  };

  return NextResponse.json(payload, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
