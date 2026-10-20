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
        'contributor_share_percent',
        'status',
        'checkout_url',
        'paid_at',
        'provider_metadata',
        'license_snapshot',
        'license_terms_snapshot',
        'license_accepted_at',
        'contributor_share_amount_minor',
        'platform_commission_amount_minor',
    ];

    protected function casts(): array
    {
        return [
            'amount_minor' => 'integer',
            'contributor_share_amount_minor' => 'integer',
            'platform_commission_amount_minor' => 'integer',
            'contributor_share_percent' => 'decimal:2',
            'paid_at' => 'datetime',
            'license_accepted_at' => 'datetime',
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
