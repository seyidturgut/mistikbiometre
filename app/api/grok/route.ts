import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XAI_URL = "https://api.x.ai/v1/chat/completions";
const DEFAULT_MODEL = "grok-2-1212";
const TIMEOUT_MS = 18000;

interface GrokRequest {
  kind: "palm" | "face" | "voice";
  data: Record<string, unknown>;
}

const SYSTEM_PROMPT_TR =
  "Sen mistik bir biyometri okuyucususun. Türkçe cevap verirsin. " +
  "Akıcı, sıcak, mistik tonda yazarsın ama melodram yapmazsın. " +
  "Asla 'belki', 'olabilir' gibi sallantılı kelimeleri sık kullanma. " +
  "Yalnızca istenen JSON formatında cevap döndür, fazladan metin ya da " +
  "markdown bloğu ekleme.";

function userPrompt(kind: GrokRequest["kind"], data: unknown): string {
  const json = JSON.stringify(data);
  switch (kind) {
    case "palm":
      return [
        "Aşağıda bir avuç içi tarama analizi var.",
        "5 bölümlük bir Türkçe el falı okuması üret. Her bölüm 2-3 cümle, kişisel ve detaylı olsun.",
        "Şu JSON şemasında dön: { \"intro\": string, \"love\": string, \"career\": string, \"health\": string, \"conclusion\": string }",
        "Veri: " + json,
      ].join("\n");
    case "face":
      return [
        "Aşağıda bir yüz geometrisi analizi var (oranlar + iris bilgisi).",
        "Bu kişi için bir 'Arketip' (1-3 kelime, özgün) ve 2-3 cümlelik açıklama, ayrıca akıl/irade/algı için 1-2 cümlelik kişisel kısa metinler üret.",
        "Şu JSON şemasında dön: { \"archetype\": string, \"archetypeDescription\": string, \"traits\": { \"intellect\": string, \"willpower\": string, \"perception\": string } }",
        "Veri: " + json,
      ].join("\n");
    case "voice":
      return [
        "Aşağıda bir ses tarama analizi var (frekans + istikrar).",
        "Bu kişiye uygun aktif çakra adını, çakra rengi (hex), ve 2-3 cümlelik 'vocal aura' açıklamasını üret.",
        "Şu JSON şemasında dön: { \"chakra\": string, \"chakraColor\": string (hex), \"vocalAura\": string }",
        "Veri: " + json,
      ].join("\n");
  }
}

interface XaiChoice {
  message?: { content?: string };
}

export async function POST(req: Request) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "XAI_API_KEY tanımlı değil" },
      { status: 500 },
    );
  }

  let body: GrokRequest;
  try {
    body = (await req.json()) as GrokRequest;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  if (!body?.kind || !body?.data) {
    return NextResponse.json(
      { error: "kind ve data alanları zorunlu" },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(XAI_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL ?? DEFAULT_MODEL,
        temperature: 0.85,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT_TR },
          { role: "user", content: userPrompt(body.kind, body.data) },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `xAI ${res.status}: ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const json = (await res.json()) as { choices?: XaiChoice[] };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: "Boş cevap" },
        { status: 502 },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "JSON parse hatası", raw: content },
        { status: 502 },
      );
    }

    return NextResponse.json({ content: parsed });
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Zaman aşımı"
          : err.message
        : "Bilinmeyen hata";
    return NextResponse.json({ error: msg }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
