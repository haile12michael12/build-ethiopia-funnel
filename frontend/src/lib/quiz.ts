import type { QuizFunnelQuestion } from "@/db/schema";
import type { Segment } from "@/lib/personalize";

export function visibleQuestions(questions: QuizFunnelQuestion[], answers: Record<string, string[]>) {
  return questions.filter((q) => {
    if (!q.showIf) return true;
    const given = answers[q.showIf.questionId] || [];
    return given.includes(q.showIf.equals);
  });
}

export function scoreAnswers(questions: QuizFunnelQuestion[], answers: Record<string, string[]>) {
  const scoreByTag: Record<string, number> = {};
  let totalScore = 0;
  for (const q of questions) {
    const chosen = answers[q.id] || [];
    for (const optId of chosen) {
      const opt = q.options.find((o) => o.id === optId);
      if (!opt) continue;
      totalScore += opt.points;
      scoreByTag[opt.tag] = (scoreByTag[opt.tag] || 0) + opt.points;
    }
  }
  const topTag = Object.entries(scoreByTag).sort((a, b) => b[1] - a[1])[0]?.[0];
  return { scoreByTag, totalScore, topTag };
}

export function qualify(totalScore: number, hotThreshold: number, warmThreshold: number): "hot" | "warm" | "cold" {
  if (totalScore >= hotThreshold) return "hot";
  if (totalScore >= warmThreshold) return "warm";
  return "cold";
}

export function tagToSegment(tag?: string | null): Segment {
  const known: Segment[] = ["founder", "freelancer", "developer", "marketer", "ethiopia", "agency", "prompts", "course", "default"];
  if (tag && (known as string[]).includes(tag)) return tag as Segment;
  return "default";
}

export const DEFAULT_QUIZ_QUESTIONS: QuizFunnelQuestion[] = [
  {
    id: "goal",
    prompt: "What are you trying to ship in the next 30 days?",
    type: "single",
    options: [
      { id: "site", label: "A website or landing page", points: 20, tag: "founder" },
      { id: "code", label: "A SaaS app or codebase", points: 20, tag: "developer" },
      { id: "client", label: "Client deliverables", points: 20, tag: "freelancer" },
      { id: "content", label: "Marketing content / prompts", points: 20, tag: "prompts" },
    ],
  },
  {
    id: "stage",
    prompt: "Where is the project right now?",
    type: "single",
    options: [
      { id: "idea", label: "Just an idea", points: 5, tag: "founder" },
      { id: "building", label: "Actively building", points: 15, tag: "developer" },
      { id: "live", label: "Live, needs more offers", points: 25, tag: "agency" },
    ],
  },
  {
    id: "budget",
    prompt: "What's a reasonable budget for this right now?",
    type: "single",
    options: [
      { id: "low", label: "Under $30", points: 10, tag: "prompts" },
      { id: "mid", label: "$30–$150", points: 25, tag: "founder" },
      { id: "high", label: "$150+", points: 35, tag: "agency" },
    ],
  },
  {
    id: "region",
    prompt: "Where will you pay from?",
    type: "single",
    options: [
      { id: "et", label: "Ethiopia (Telebirr / CBE / ETB)", points: 15, tag: "ethiopia" },
      { id: "intl", label: "Outside Ethiopia", points: 10, tag: "founder" },
    ],
  },
  {
    id: "timeline",
    prompt: "How soon do you want this live?",
    type: "single",
    showIf: { questionId: "stage", equals: "building" },
    options: [
      { id: "week", label: "This week", points: 20, tag: "developer" },
      { id: "month", label: "Within a month", points: 10, tag: "developer" },
    ],
  },
];
