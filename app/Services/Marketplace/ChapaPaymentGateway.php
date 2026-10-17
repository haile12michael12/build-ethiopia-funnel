<?php

namespace App\Services\Marketplace;

use App\Models\MarketplacePurchase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ChapaPaymentGateway
{
    public function configured(): bool
    {
        return filled(config('services.chapa.secret_key'));
    }

    public function initialize(MarketplacePurchase $purchase): string
    {
        $secret = config('services.chapa.secret_key');
        if (! is_string($secret) || $secret === '') {
            throw new HttpException(503, 'Marketplace checkout is not configured yet.');
        }

        $buyer = $purchase->buyer;
        $name = preg_split('/\s+/', trim((string) $buyer->name), 2) ?: [];
        $amount = number_format($purchase->amount_minor / 100, 2, '.', '');

        try {
            $response = Http::withToken($secret)
                ->acceptJson()
                ->connectTimeout(3)
                ->timeout(10)
                ->post('https://api.chapa.co/v1/transaction/initialize', [
                    'amount' => $amount,
                    'currency' => $purchase->currency,
                    'email' => $buyer->email,
                    'first_name' => $name[0] ?? $buyer->email,
                    'last_name' => $name[1] ?? '',
                    'tx_ref' => $purchase->tx_ref,
                    'return_url' => route('marketplace.checkout.return', ['tx_ref' => $purchase->tx_ref]),
                    'callback_url' => route('marketplace.chapa.webhook'),
                    'customization' => [
                        'title' => mb_substr($purchase->template->name, 0, 16),
                        'description' => 'Marketplace digital product',
                    ],
                ]);
        } catch (ConnectionException $exception) {
            throw new HttpException(503, 'Could not connect to Chapa. The purchase is still pending; please retry checkout.', $exception);
        }

        $data = $response->json('data');
        $checkoutUrl = is_array($data) ? ($data['checkout_url'] ?? null) : null;
        if (! $response->successful() || ! is_string($checkoutUrl)
            || ! filter_var($checkoutUrl, FILTER_VALIDATE_URL)
            || parse_url($checkoutUrl, PHP_URL_SCHEME) !== 'https'
            || parse_url($checkoutUrl, PHP_URL_HOST) !== 'checkout.chapa.co') {
            throw new HttpException(503, 'Chapa could not initialize checkout. Please try again later.');
        }

        return $checkoutUrl;
    }

    /**
     * @return array{tx_ref:string,status:string,amount_minor:int,currency:string,transaction_id:?string}
     */
    public function verify(string $txRef): array
    {
        $secret = config('services.chapa.secret_key');
        if (! is_string($secret) || $secret === '') {
            throw new HttpException(503, 'Marketplace checkout is not configured yet.');
        }

        try {
            $response = Http::withToken($secret)
                ->acceptJson()
                ->connectTimeout(3)
                ->timeout(10)
                ->get('https://api.chapa.co/v1/transaction/verify/'.rawurlencode($txRef));
        } catch (ConnectionException $exception) {
            throw new HttpException(503, 'Could not verify the Chapa transaction. Please try again.', $exception);
        }

        $data = $response->json('data');
        if (! $response->successful() || ! is_array($data)) {
            throw new HttpException(503, 'Chapa could not verify this transaction.');
        }

        $amount = $data['amount'] ?? null;
        if (! is_numeric($amount) || (float) $amount < 0) {
            throw new HttpException(503, 'Chapa returned an invalid transaction amount.');
        }

        return [
            'tx_ref' => (string) ($data['tx_ref'] ?? ''),
            'status' => strtolower((string) ($data['status'] ?? '')),
            'amount_minor' => (int) round((float) $amount * 100),
            'currency' => strtoupper((string) ($data['currency'] ?? '')),
            'transaction_id' => isset($data['id']) ? (string) $data['id'] : null,
        ];
    }

    public function validWebhookSignature(string $payload, ?string $chapaSignature, ?string $payloadSignature): bool
    {
        $secret = config('services.chapa.webhook_secret');
        if (! is_string($secret) || $secret === '') {
            return false;
        }

        $expectedSecretSignature = hash_hmac('sha256', $secret, $secret);
        $expectedPayloadSignature = hash_hmac('sha256', $payload, $secret);

        return ($chapaSignature !== null && hash_equals($expectedSecretSignature, $chapaSignature))
            || ($payloadSignature !== null && hash_equals($expectedPayloadSignature, $payloadSignature));
    }
}
