<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SiteContent extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'title_en',
        'title_am',
        'slug',
        'summary_en',
        'summary_am',
        'body_en',
        'body_am',
        'image',
        'category',
        'highlights_en',
        'highlights_am',
        'person_name_en',
        'person_name_am',
        'person_role_en',
        'person_role_am',
        'company_en',
        'company_am',
        'status',
        'published_at',
        'sort_order',
        'seo_title_en',
        'seo_title_am',
        'seo_description_en',
        'seo_description_am',
    ];

    protected $casts = [
        'highlights_en' => 'array',
        'highlights_am' => 'array',
        'published_at' => 'datetime',
        'sort_order' => 'integer',
    ];

    public const TYPES = ['service', 'blog', 'testimonial', 'page'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderByDesc('published_at')->orderByDesc('id');
    }

    public function localized(string $field, ?string $locale = null): ?string
    {
        $locale ??= app()->getLocale();
        $localizedField = $field.'_'.($locale === 'am' ? 'am' : 'en');

        return $this->{$localizedField} ?: $this->{$field.'_en'};
    }
}
