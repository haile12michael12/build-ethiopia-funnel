<?php

namespace App\Services\Marketplace;

use App\Models\MarketplacePurchase;
use App\Models\MarketplaceWebhookEvent;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class MarketplacePurchaseService
{
    public function __construct(private readonly ChapaPaymentGateway $gateway) {}

    public function verifyAndFulfill(MarketplacePurchase $purchase): bool
    {
        if ($purchase->status === 'paid') {
            return true;
        }
        if (! in_array($purchase->status, ['pending', 'failed'], true)) {
            return false;
        }

        $verified = $this->gateway->verify($purchase->tx_ref);
        if (
            $verified['tx_ref'] !== $purchase->tx_ref
            || $verified['status'] !== 'success'
            || $verified['amount_minor'] !== $purchase->amount_minor
            || $verified['currency'] !== $purchase->currency
        ) {
            return false;
        }

        DB::transaction(function () use ($purchase, $verified): void {
            $locked = MarketplacePurchase::query()->lockForUpdate()->findOrFail($purchase->id);
            if ($locked->status === 'paid') {
                return;
            }
            if (! in_array($locked->status, ['pending', 'failed'], true)) {
                throw new HttpException(409, 'This marketplace purchase is no longer pending.');
            }

            $locked->update([
                'provider_transaction_id' => $verified['transaction_id'],
                'status' => 'paid',
                'paid_at' => now(),
            ]);
        });

        return true;
    }

    public function recordWebhook(string $payload, string $txRef): bool
    {
        $key = hash('sha256', $payload);
        $event = MarketplaceWebhookEvent::query()->firstOrCreate(
            ['provider_event_key' => $key],
            ['tx_ref' => $txRef, 'status' => 'received'],
        );
        if ($event->status === 'processed') {
            return true;
        }

        $purchase = MarketplacePurchase::query()->where('tx_ref', $txRef)->first();
        if (! $purchase) {
            throw new HttpException(404, 'No marketplace purchase matches this Chapa transaction.');
        }

        if (! $this->verifyAndFulfill($purchase)) {
            throw new HttpException(503, 'Chapa has not confirmed this payment yet.');
        }

        $event->update(['status' => 'processed', 'processed_at' => now()]);

        return true;
    }
}
