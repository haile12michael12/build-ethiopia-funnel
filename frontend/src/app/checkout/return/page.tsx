import { redirect } from "next/navigation";
import { fulfillPaidOrder } from "@/lib/fulfill-order";
import { sandboxPaymentsEnabled, verifyChapaTransaction } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; tx_ref?: string; trx_ref?: string }>;
}) {
  const sp = await searchParams;
  const orderNumber = sp.order || sp.tx_ref || sp.trx_ref;
  if (!orderNumber) redirect("/cart");

  const verified = await verifyChapaTransaction(orderNumber);
  if (verified.ok) {
    const result = await fulfillPaidOrder(orderNumber, { reference: orderNumber, payload: verified.raw });
    if (result.ok && "next" in result && result.next) redirect(result.next);
    redirect(`/thank-you?order=${orderNumber}`);
  }
  if (sandboxPaymentsEnabled()) {
    redirect(`/pay/ethiopia?order=${encodeURIComponent(orderNumber)}&method=chapa`);
  }
  redirect(`/pay/waiting?order=${encodeURIComponent(orderNumber)}`);
}
