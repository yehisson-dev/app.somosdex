export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { searchBrain, buildContext } from "@/lib/brain/search";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: agentId } = await params;
  const { client_id } = await req.json() as { client_id: string };

  if (!client_id) return NextResponse.json({ error: "client_id requerido" }, { status: 400 });

  const supabase = createAdminClient();

  // Load agent
  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .single();

  if (!agent) return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 });
  if (!agent.system_prompt?.trim()) {
    return NextResponse.json({ error: "Este agente no tiene instrucciones configuradas aún." }, { status: 400 });
  }

  // Load client data
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", client_id)
    .single();

  if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  // Load user for created_by
  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("email", session.user?.email ?? "")
    .single();

  // Search brain for context (Cubo Brain + Brand Brain of this client)
  let brainContext = "";
  try {
    const chunks = await searchBrain(
      `${agent.name} ${client.name} ${client.company ?? ""}`,
      client_id,
      "both",
      10,
    );
    brainContext = buildContext(chunks);
  } catch {
    // Brain search is best-effort
  }

  // Build client profile block
  const clientBlock = [
    `Nombre del cliente: ${client.name}`,
    client.company       ? `Empresa: ${client.company}`             : null,
    client.email         ? `Email: ${client.email}`                 : null,
    client.brief         ? `Brief de marca:\n${client.brief}`       : null,
    client.visual_identity ? `Identidad visual:\n${client.visual_identity}` : null,
    client.action_plan   ? `Plan de acción:\n${client.action_plan}` : null,
    client.objective     ? `Objetivos:\n${client.objective}`        : null,
  ].filter(Boolean).join("\n\n");

  // Create run record
  const { data: run } = await supabase
    .from("agent_runs")
    .insert({
      agent_id:   agentId,
      client_id,
      status:     "running",
      created_by: userRow?.id ?? null,
    })
    .select()
    .single();

  // Build messages
  const userMessage = [
    "## Información del cliente\n" + clientBlock,
    brainContext ? "\n" + brainContext : "",
    "\n---\nGenera el entregable correspondiente a tu rol para este cliente.",
  ].join("\n");

  // Stream Claude response
  const encoder = new TextEncoder();
  let fullOutput = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = anthropic.messages.stream({
          model:      "claude-sonnet-4-6",
          max_tokens: 4096,
          system:     agent.system_prompt,
          messages:   [{ role: "user", content: userMessage }],
        });

        for await (const chunk of claudeStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const text = chunk.delta.text;
            fullOutput += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }

        // Save completed output
        await supabase
          .from("agent_runs")
          .update({ status: "done", output: fullOutput })
          .eq("id", run!.id);

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, run_id: run!.id })}\n\n`));
        controller.close();
      } catch (err: any) {
        await supabase
          .from("agent_runs")
          .update({ status: "error", error_msg: String(err) })
          .eq("id", run!.id);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}
