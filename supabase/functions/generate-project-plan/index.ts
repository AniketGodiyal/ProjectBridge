import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PlannerInput {
  title?: string;
  description: string;
  budget?: number;
  experienceLevel?: string;
  complexity?: string;
  deadline?: string;
  existingEquipment?: string;
  desiredCapabilities?: string;
  constraints?: string;
  resourcePrices?: { name: string; price_per_hour: number }[];
}

const MAX_INPUT_LENGTH = 5000;

const projectPlanSchema = z.object({
  project_title: z.string(),
  project_summary: z.string(),
  assumptions: z.array(z.string()).default([]),
  clarification_questions: z.array(z.string()).default([]),
  requirements: z.array(
    z.object({
      name: z.string(),
      category: z.string(),
      quantity: z.number().min(1).default(1),
      importance: z.enum(["essential", "optional"]).default("optional"),
      purpose: z.string(),
      specifications: z.array(z.string()).default([]),
      estimated_cost_inr: z.object({ min: z.number(), max: z.number() }).optional(),
      safety_notes: z.array(z.string()).default([]),
      alternatives: z.array(z.string()).default([]),
      confidence: z.enum(["low", "medium", "high"]).default("medium"),
    })
  ).default([]),
  software_requirements: z.array(z.string()).default([]),
  skills_and_training: z.array(z.string()).default([]),
  estimated_total_budget_inr: z.object({ min: z.number(), max: z.number() }).optional(),
  limitations: z.array(z.string()).default([]),
});

type ValidatedProjectPlan = z.infer<typeof projectPlanSchema>;

const DEMO_PLAN: ValidatedProjectPlan = {
  project_title: "Line Follower Robot (Demo Plan)",
  project_summary:
    "A robot that detects a line on the ground and adjusts motor movement to follow it autonomously.",
  assumptions: ["Basic educational prototype", "No wireless control required", "Standard 5V power supply available"],
  clarification_questions: ["What surface color and line color will you use?", "Do you need the robot to handle intersections or curves?"],
  requirements: [
    { name: "Microcontroller (Arduino Uno)", category: "electronics", quantity: 1, importance: "essential", purpose: "Main controller to process sensor input and drive motors", specifications: ["ATmega328P", "5V operating voltage", "Digital I/O pins"], estimated_cost_inr: { min: 450, max: 700 }, safety_notes: [], alternatives: ["ESP32", "Raspberry Pi Pico"], confidence: "high" },
    { name: "IR Sensor Module", category: "electronics", quantity: 2, importance: "essential", purpose: "Detect the line under the robot", specifications: ["IR reflective sensor", "Digital output", "3.3-5V compatible"], estimated_cost_inr: { min: 50, max: 200 }, safety_notes: ["Avoid direct eye exposure to IR LED"], alternatives: ["TCRT5000 module"], confidence: "high" },
    { name: "DC Geared Motor", category: "robotics", quantity: 2, importance: "essential", purpose: "Drive the wheels for movement", specifications: ["6V DC", "200 RPM", "Gear ratio 1:48"], estimated_cost_inr: { min: 150, max: 400 }, safety_notes: [], alternatives: ["Stepper motor"], confidence: "medium" },
    { name: "Motor Driver (L298N)", category: "electronics", quantity: 1, importance: "essential", purpose: "Control motor direction and speed from the microcontroller", specifications: ["Dual H-bridge", "5V logic", "Up to 2A per channel"], estimated_cost_inr: { min: 100, max: 300 }, safety_notes: ["Heat dissipation recommended for prolonged use"], alternatives: ["L293D", "TB6612FNG"], confidence: "medium" },
    { name: "Chassis and Wheels", category: "robotics", quantity: 1, importance: "essential", purpose: "Physical frame to mount components and wheels for movement", specifications: ["Acrylic or 3D printed", "2-wheel drive"], estimated_cost_inr: { min: 200, max: 500 }, safety_notes: [], alternatives: [], confidence: "medium" },
    { name: "Power Source (Battery Pack)", category: "electronics", quantity: 1, importance: "essential", purpose: "Provide power to motors and controller", specifications: ["6V or 9V", "Rechargeable preferred"], estimated_cost_inr: { min: 100, max: 400 }, safety_notes: ["Do not short circuit", "Use correct polarity"], alternatives: ["Li-ion pack with BMS"], confidence: "medium" },
    { name: "Jumper Wires", category: "electronics", quantity: 1, importance: "essential", purpose: "Connect components on the breadboard/PCB", specifications: ["Male-to-male and male-to-female"], estimated_cost_inr: { min: 50, max: 150 }, safety_notes: [], alternatives: [], confidence: "high" },
    { name: "Breadboard", category: "electronics", quantity: 1, importance: "optional", purpose: "Prototyping platform without soldering", specifications: ["Half-size or full-size"], estimated_cost_inr: { min: 50, max: 150 }, safety_notes: [], alternatives: ["Perfboard with soldering"], confidence: "high" },
  ],
  software_requirements: ["Arduino IDE", "C/C++ for Arduino"],
  skills_and_training: ["Basic Arduino programming", "Understanding of digital I/O", "Simple control logic (PID optional)"],
  estimated_total_budget_inr: { min: 1150, max: 2800 },
  limitations: ["Costs depend on local suppliers and selected components.", "AI-generated estimates — verify with actual vendors."],
};

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
// redeploy trigger 2026-10-31
const GROQ_MODEL = "openai/gpt-oss-20b";

function buildPrompt(input: PlannerInput): string {
  const parts: string[] = [
    "You are an expert engineering advisor helping students plan technical projects.",
    "Analyze the following project request and produce a structured resource plan as JSON.",
    "",
    `Project title: ${input.title || "Not provided"}`,
    `Description: ${input.description}`,
  ];
  if (input.budget) parts.push(`Budget (INR): ${input.budget}`);
  if (input.experienceLevel) parts.push(`Experience level: ${input.experienceLevel}`);
  if (input.complexity) parts.push(`Complexity: ${input.complexity}`);
  if (input.deadline) parts.push(`Deadline/duration: ${input.deadline}`);
  if (input.existingEquipment) parts.push(`Existing equipment: ${input.existingEquipment}`);
  if (input.desiredCapabilities) parts.push(`Desired capabilities: ${input.desiredCapabilities}`);
  if (input.constraints) parts.push(`Constraints: ${input.constraints}`);
  if (input.resourcePrices && input.resourcePrices.length > 0) {
    const priceLines = input.resourcePrices.map((r) => `- ${r.name}: ₹${r.price_per_hour}/hour`).join("\n");
    parts.push(`Institutional resource rates (per hour):\n${priceLines}`);
    parts.push("Use these rates to estimate booking costs for matched resources. External purchase cost estimates remain separate.");
  }

  parts.push(
    "",
    "Return ONLY valid JSON with this exact structure, no markdown fences:",
    `{
  "project_title": string,
  "project_summary": string,
  "assumptions": string[],
  "clarification_questions": string[],
  "requirements": [
    {
      "name": string,
      "category": string,
      "quantity": number,
      "importance": "essential" | "optional",
      "purpose": string,
      "specifications": string[],
      "estimated_cost_inr": { "min": number, "max": number },
      "safety_notes": string[],
      "alternatives": string[],
      "confidence": "low" | "medium" | "high"
    }
  ],
  "software_requirements": string[],
  "skills_and_training": string[],
  "estimated_total_budget_inr": { "min": number, "max": number },
  "limitations": string[]
}`,
    "",
    "Rules:",
    "- Costs are AI estimates in INR — label them as estimates.",
    "- Include safety notes where relevant.",
    "- Ask clarification questions if important details are missing.",
    "- Be specific about component names and quantities.",
    "- Include alternatives where reasonable.",
    "- Do not invent exact market prices.",
    "- Do not mention any institution's inventory or availability. Resource matching is handled separately.",
    "- If a per-hour resource price is provided in the input, factor it into cost estimates.",
  );
  return parts.join("\n");
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractJson(text: string): string {
  let t = text.trim();

  // Strip <think>...</think> blocks (gpt-oss reasoning traces)
  t = t.replace(/<think>[\s\S]*?<\/think>/gi, "");
  // Strip unclosed <think> block (everything up to the first '{' or '[')
  t = t.replace(/<think>[\s\S]*$/i, "");

  // Strip markdown code fences
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");

  t = t.trim();

  // If the whole thing is already valid JSON, return as-is
  if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
    return t;
  }

  // Find the first '{' and last '}' — extract the outermost JSON object
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return t.slice(start, end + 1);
  }

  return t;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonError(405, "Method not allowed. Use POST.");
    }

    let body: PlannerInput;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, "Invalid JSON body.");
    }

    if (!body.description || body.description.trim().length === 0) {
      return jsonError(400, "Project description is required.");
    }
    if (body.description.length > MAX_INPUT_LENGTH) {
      return jsonError(400, "Project description is too long. Maximum 5000 characters.");
    }

    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      return new Response(
        JSON.stringify({
          demo: true,
          message:
            "AI service (Groq) is not configured. Showing a demonstration plan. Add GROQ_API_KEY as a Supabase edge function secret to enable live AI generation.",
          plan: DEMO_PLAN,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let groqResponse: Response;
    try {
      groqResponse = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: "You are an engineering project planning assistant. You respond ONLY with a single valid JSON object. No prose, no code fences, no explanations — just the JSON." },
            { role: "user", content: buildPrompt(body) },
          ],
          temperature: 0.5,
          max_tokens: 4096,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr instanceof DOMException && fetchErr.name === "AbortError") {
        return jsonError(504, "The AI service timed out. Please try again.");
      }
      console.error("Groq fetch error:", fetchErr);
      return jsonError(502, "Could not reach the AI service. Please try again later.");
    }
    clearTimeout(timeout);

    if (groqResponse.status === 401 || groqResponse.status === 403) {
      console.error("Groq auth error:", groqResponse.status);
      return jsonError(502, "The AI service rejected the API key. Check that GROQ_API_KEY is valid.");
    }
    if (groqResponse.status === 429) {
      return jsonError(429, "The AI service is rate-limited. Please wait a moment and try again.");
    }
    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error("Groq API error:", groqResponse.status, errText);
      return jsonError(502, `AI service error (${groqResponse.status}). Please try again later.`);
    }

    const groqData = await groqResponse.json();
    const textContent = groqData?.choices?.[0]?.message?.content;

    if (!textContent) {
      return jsonError(502, "AI returned an empty response. Please try again with more details.");
    }

    let parsedPlan: unknown;
    try {
      parsedPlan = JSON.parse(extractJson(textContent));
    } catch {
      return jsonError(502, "AI returned malformed JSON. Please try again.");
    }

    const result = projectPlanSchema.safeParse(parsedPlan);
    if (!result.success) {
      console.error("Schema validation failed:", result.error.issues);
      return jsonError(502, "AI returned a response that did not match the expected structure. Please try again.");
    }

    return new Response(
      JSON.stringify({ plan: result.data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return jsonError(500, "An unexpected error occurred. Please try again.");
  }
});
