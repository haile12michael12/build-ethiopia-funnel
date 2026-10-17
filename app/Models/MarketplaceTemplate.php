<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketplaceTemplate extends Model
{
    protected $table = 'marketplace_templates';

    protected $fillable = [
        'owner_id',
        'slug',
        'type',
        'name',
        'description',
        'preview_images',
        'tech_stack',
        'amount_minor',
        'currency',
        'included_modules',
        'version',
        'changelog',
        'license',
        'file_path',
        'status',
        'contributor_revenue_share_percent',
    ];

    protected function casts(): array
    {
        return [
            'preview_images' => 'array',
            'tech_stack' => 'array',
            'amount_minor' => 'integer',
            'included_modules' => 'array',
            'contributor_revenue_share_percent' => 'decimal:2',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function purchases(): HasMany
    {
        return $this->hasMany(MarketplacePurchase::class, 'template_id');
    }

    public function bundleItems(): BelongsToMany
    {
        return $this->belongsToMany(
            self::class,
            'marketplace_template_items',
            'bundle_id',
            'template_id',
        );
    }

    public function bundles(): BelongsToMany
    {
        return $this->belongsToMany(
            self::class,
            'marketplace_template_items',
            'template_id',
            'bundle_id',
        );
    }
}
