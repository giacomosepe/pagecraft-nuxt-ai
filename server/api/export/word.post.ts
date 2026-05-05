import { serverSupabaseClient, serverSupabaseServiceRole } from "#supabase/server";
import { z } from "zod";
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  AlignmentType,
  TextRun,
} from "docx";

const BodySchema = z.object({
  pageId: z.string().uuid("Invalid page ID"),
});

const RICH_TEXT_TAG_RE = /<(p|ul|ol|li|strong|b|em|i|br)(\s|>|\/)/i;

function isRichTextHtml(value: string): boolean {
  return RICH_TEXT_TAG_RE.test(value);
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function textRunsFromRichHtml(value: string): TextRun[] {
  const runs: TextRun[] = [];
  let bold = false;
  let italics = false;
  const tokens = value.split(/(<\/?(?:strong|b|em|i)[^>]*>|<br\s*\/?>)/gi);

  for (const token of tokens) {
    if (!token) continue;
    if (/^<br\s*\/?>$/i.test(token)) {
      runs.push(new TextRun({ text: "", break: 1 }));
      continue;
    }
    if (/^<(strong|b)\b/i.test(token)) {
      bold = true;
      continue;
    }
    if (/^<\/(strong|b)>$/i.test(token)) {
      bold = false;
      continue;
    }
    if (/^<(em|i)\b/i.test(token)) {
      italics = true;
      continue;
    }
    if (/^<\/(em|i)>$/i.test(token)) {
      italics = false;
      continue;
    }

    const text = decodeHtml(token.replace(/<[^>]+>/g, ""));
    if (!text) continue;
    runs.push(new TextRun({ text, bold, italics }));
  }

  return runs.length ? runs : [new TextRun("")];
}

function plainTextParagraphs(value: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  for (const block of value.split(/\n\n+/)) {
    if (!block.trim()) continue;
    paragraphs.push(
      new Paragraph({
        children: block.split("\n").flatMap((line, i, arr) =>
          i < arr.length - 1
            ? [new TextRun(line), new TextRun({ text: "", break: 1 })]
            : [new TextRun(line)],
        ),
      }),
    );
  }
  return paragraphs;
}

function richTextParagraphs(value: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const blockRe = /<(p|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(value))) {
    const [, tag, content] = match;
    if (!content?.replace(/<[^>]+>/g, "").trim()) continue;
    paragraphs.push(
      new Paragraph({
        children: textRunsFromRichHtml(content),
        ...(tag.toLowerCase() === "li" ? { bullet: { level: 0 } } : {}),
      }),
    );
  }

  return paragraphs.length ? paragraphs : plainTextParagraphs(value.replace(/<[^>]+>/g, ""));
}

function outputParagraphs(value: string): Paragraph[] {
  return isRichTextHtml(value) ? richTextParagraphs(value) : plainTextParagraphs(value);
}

export default defineEventHandler(async (event) => {
  // ─── Step 1: Authenticate ─────────────────────────────────────────────────
  const userClient = await serverSupabaseClient(event);
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

  // ─── Step 2: Validate request body ───────────────────────────────────────
  const body = await readBody(event);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? "Invalid request",
    });
  }
  const { pageId } = parsed.data;

  // ─── Step 3: Verify page ownership ───────────────────────────────────────
  const { error: ownerError } = await userClient
    .from("pages")
    .select("id")
    .eq("id", pageId)
    .single();
  if (ownerError) throw createError({ statusCode: 403, message: "Access denied" });

  const supabase = serverSupabaseServiceRole(event);

  // ─── Step 4: Load page + client data ─────────────────────────────────────
  const { data: page, error: pageError } = await supabase
    .from("pages")
    .select("title, tax_year, client:clients ( company_name, company_form )")
    .eq("id", pageId)
    .single();
  if (pageError || !page) throw createError({ statusCode: 404, message: "Page not found" });

  // ─── Step 5: Load committed steps in order ────────────────────────────────
  const { data: steps, error: stepsError } = await supabase
    .from("steps")
    .select("order, title, committed_output")
    .eq("page_id", pageId)
    .not("committed_output", "is", null)
    .order("order", { ascending: true });
  if (stepsError) throw createError({ statusCode: 500, message: "Failed to load steps" });

  // ─── Step 6: Build document ───────────────────────────────────────────────
  const client = (page as any).client;
  const companyName = [client?.company_name, client?.company_form]
    .filter(Boolean)
    .join(" ");
  const taxYear = (page as any).tax_year;

  const children: Paragraph[] = [
    new Paragraph({
      text: "RELAZIONE ILLUSTRATIVA AI FINI DEL PATENT BOX",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: companyName || (page as any).title,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: taxYear ? `Anno fiscale: ${taxYear}` : "",
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: new Date().toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: "" }),
  ];

  for (const step of steps ?? []) {
    if (!step.committed_output) continue;
    children.push(
      new Paragraph({ text: step.title, heading: HeadingLevel.HEADING_1 }),
    );
    children.push(...outputParagraphs(step.committed_output));
    children.push(new Paragraph({ text: "" }));
  }

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);

  // ─── Step 7: Stream as download ───────────────────────────────────────────
  const slug = companyName.replace(/\s+/g, "-").toLowerCase() || pageId;
  setResponseHeaders(event, {
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename="patent-box-${slug}.docx"`,
    "Content-Length": buffer.byteLength.toString(),
  });

  return buffer;
});
