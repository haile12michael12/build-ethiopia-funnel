"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/providers";

export function AddToCartCta({ productId }: { productId: number }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  async function buy() {
    setPending(true);
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1, license: "personal" }),
    });
    setPending(false);
    if (!res.ok) {
      toast.push("Could not add to cart");
      return;
    }
    router.push("/checkout");
  }

  return (
    <Button className="mt-4 w-full" disabled={pending} onClick={() => void buy()}>
      {pending ? "Adding…" : "Get this now"}
    </Button>
  );
}
