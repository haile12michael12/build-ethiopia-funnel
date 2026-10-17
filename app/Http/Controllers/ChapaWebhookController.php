<?php

namespace App\Http\Controllers;

use App\Services\Marketplace\ChapaPaymentGateway;
use App\Services\Marketplace\MarketplacePurchaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ChapaWebhookController extends Controller
{
    public function __invoke(
        Request $request,
        ChapaPaymentGateway $gateway,
        MarketplacePurchaseService $purchases,
    ): JsonResponse {
        $payload = $request->getContent();
        abort_unless($gateway->validWebhookSignature(
            $payload,
            $request->header('chapa-signature'),
            $request->header('x-chapa-signature'),
        ), 401, 'Invalid Chapa webhook signature.');

        $txRef = data_get($request->json()->all(), 'tx_ref')
            ?? data_get($request->json()->all(), 'data.tx_ref');
        if (! is_string($txRef) || $txRef === '') {
            throw new HttpException(422, 'The Chapa webhook did not include a transaction reference.');
        }

        $purchases->recordWebhook($payload, $txRef);

        return response()->json(['received' => true]);
    }
}
