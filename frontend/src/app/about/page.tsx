export const metadata = { title: "About DigitalForge" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-copper">Studio</p>
      <h1 className="mt-3 font-display text-5xl">A digital products house, not a theme dump.</h1>
      <p className="mt-6 text-lg text-muted">
        DigitalForge designs and ships templates, prompts, kits and courses for people who sell. We care about licenses, delivery and the unglamorous pages — checkout, thank-you, the email after.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {["Ethos: ship the smallest thing that sells", "Craft: named files, real copy", "Market: USD and ETB, without fake urgency"].map((x) => (
          <div key={x} className="surface rounded-3xl p-5 text-sm">{x}</div>
        ))}
      </div>
    </div>
  );
}
