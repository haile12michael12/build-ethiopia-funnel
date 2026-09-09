import type { Product } from "@/db/schema";

const PROMPTS = [
  "Write a 7-email welcome sequence for a [industry] SaaS that converts trials into paid plans.",
  "Turn this messy offer: [offer] into a landing page outline with hook, proof, and CTA.",
  "Act as a senior product marketer. Draft positioning for [product] against [competitor].",
  "Generate 20 LinkedIn posts for a freelance [role] targeting Ethiopian SMEs.",
  "Create a pricing page narrative for a three-tier [product] with annual emphasis.",
  "Summarize this customer interview into jobs-to-be-done and objections: [transcript].",
  "Write a cold email sequence selling [service] to [persona] without sounding salesy.",
  "Produce a Notion SOP for onboarding a new [role] in a 6-person studio.",
  "Design a prompt that turns meeting notes into a client proposal in our voice.",
  "Give me 15 ChatGPT prompts to research a local market in Addis Ababa for [product].",
];

export function buildDownloadFile(product: Product, licenseKey: string) {
  const title = product.title;
  const body = [
    `${title}`,
    `DigitalForge licensed copy`,
    `License: ${licenseKey}`,
    `Version: ${product.version ?? "1.0.0"}`,
    ``,
    product.whatYouGet || product.description,
    ``,
    `What's included:`,
    ...(product.included ?? []).map((i) => `- ${i}`),
    ``,
  ];

  if (product.type === "prompt" || product.fileKey === "prompts") {
    body.push("Prompt library", ...PROMPTS.map((p, i) => `${i + 1}. ${p}`));
  }

  body.push(
    ``,
    `This file is generated for the licensed buyer. Redistribution is not permitted under the Personal license.`,
    `Need a commercial or extended license? Upgrade from your dashboard.`,
  );

  const content = body.join("\n");
  const fileName = product.fileName || `${product.slug}.txt`;
  return {
    fileName,
    mime: "text/plain; charset=utf-8",
    buffer: Buffer.from(content, "utf8"),
  };
}
