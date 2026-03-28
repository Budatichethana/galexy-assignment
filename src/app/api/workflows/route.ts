import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { formatPrismaError, withPrismaRetry } from "@/lib/prismaRetry";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    console.log("[Workflows API] Fetching workflows for userId:", userId);

    const workflows = await withPrismaRetry(() =>
      prisma.workflow.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),
    );

    console.log("[Workflows API] Successfully fetched", workflows.length, "workflows");
    return NextResponse.json({ workflows });
  } catch (error) {
    const message = formatPrismaError(error) || "Failed to fetch workflows";
    console.error("[Workflows API] GET failed", { message, error });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      nodes?: unknown;
      edges?: unknown;
    };

    const nodes = Array.isArray(body.nodes) ? body.nodes : [];
    const edges = Array.isArray(body.edges) ? body.edges : [];

    console.log("[Workflows API] Creating workflow for userId:", userId);

    const workflow = await withPrismaRetry(() =>
      prisma.workflow.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          name: body.name?.trim() || "Untitled Workflow",
          nodes,
          edges,
        },
        select: {
          id: true,
          name: true,
          updatedAt: true,
        },
      }),
    );

    console.log("[Workflows API] Successfully created workflow:", workflow.id);
    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    const message = formatPrismaError(error) || "Failed to create workflow";
    console.error("[Workflows API] POST failed", { message, error });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
