<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketplaceWebhookEvent extends Model
{
    protected $fillable = [
        'provider_event_key',
        'tx_ref',
        'status',
        'processed_at',
    ];

    protected function casts(): array
    {
        return ['processed_at' => 'datetime'];
    }
}
