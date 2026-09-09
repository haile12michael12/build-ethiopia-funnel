import { desc } from "drizzle-orm";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { ReviewModeration } from "@/components/review-moderation";

export const dynamic = "force-dynamic";

export default async function AdminReviews() {
  const rows = await db.select().from(reviews).orderBy(desc(reviews.createdAt));
  return (
    <div>
      <h1 className="font-display text-4xl">Reviews</h1>
      <ReviewModeration reviews={rows} />
    </div>
  );
}
