<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketplacePurchase extends Model
{
    protected $table = 'marketplace_purchases';

    protected $fillable = [
        'buyer_id',
        'template_id',
        'provider',
        'tx_ref',
        'provider_transaction_id',
        'amount_minor',
        'currency',
        'status',
        'checkout_url',
        'paid_at',
        'provider_metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount_minor' => 'integer',
            'paid_at' => 'datetime',
            'provider_metadata' => 'array',
        ];
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(MarketplaceTemplate::class, 'template_id');
    }
}
