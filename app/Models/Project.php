<?php

namespace App\Models;

use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title_en',
        'title_am',
        'slug',
        'summary_en',
        'summary_am',
        'description_en',
        'description_am',
        'category',
        'cover_image',
        'gallery',
        'technologies',
        'demo_url',
        'repo_url',
        'video_url',
        'status',
        'is_published',
        'is_featured',
        'sort_order',
        'published_at',
    ];

    protected $casts = [
        'gallery' => 'array',
        'technologies' => 'array',
        'is_published' => 'boolean',
        'is_featured' => 'boolean',
        'sort_order' => 'integer',
        'published_at' => 'datetime',
    ];

    /**
     * Categories supported by the portfolio.
     *
     * @var array<string, array{en: string, am: string}>
     */
    public const CATEGORIES = [
        'ai_automation' => ['en' => 'AI & Automations', 'am' => 'አርቴፊሻል ኢንተለጀንስ እና አውቶሜሽን'],
        'saas' => ['en' => 'SaaS & Dashboards', 'am' => 'የደመና መተግበሪያዎች (SaaS)'],
        'laravel' => ['en' => 'Laravel Applications', 'am' => 'የላራቬል መተግበሪያዎች'],
        'react_nextjs' => ['en' => 'React & Next.js Websites', 'am' => 'የReact እና Next.js ድህረ-ገጾች'],
        'ecommerce' => ['en' => 'E-Commerce & Marketplaces', 'am' => 'የኢ-ኮሜርስ እና የገበያ ስርዓቶች'],
        'directory' => ['en' => 'Job Portals & Directories', 'am' => 'የስራ እና የመረጃ ፖርታሎች'],
        'crm' => ['en' => 'CRM & Business Systems', 'am' => 'CRM እና የንግድ አሰራር ስርዓቶች'],
        'custom_software' => ['en' => 'API & Custom Software', 'am' => 'ኤፒአይ እና ብጁ ሶፍትዌር'],
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function (Project $project) {
            if (empty($project->slug)) {
                $project->slug = static::generateUniqueSlug($project->title_en ?: 'project');
            }
        });
    }

    /**
     * Generate a globally unique slug for a project.
     */
    public static function generateUniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $baseSlug = Str::slug($title);
        if ($baseSlug === '') {
            $baseSlug = 'project';
        }

        $slug = $baseSlug;
        $counter = 1;

        while (static::query()
            ->where('slug', $slug)
            ->when($ignoreId, fn (Builder $q) => $q->where('id', '!=', $ignoreId))
            ->exists()) {
            $counter++;
            $slug = "{$baseSlug}-{$counter}";
        }

        return $slug;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true)
            ->where('status', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }

    public function scopeFeatured(Builder $query): Builder
    {
        return $query->where('is_featured', true);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order', 'asc')
            ->orderByDesc('published_at')
            ->orderByDesc('id');
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (! $term) {
            return $query;
        }

        return $query->where(function (Builder $q) use ($term) {
            $q->where('title_en', 'like', "%{$term}%")
                ->orWhere('title_am', 'like', "%{$term}%")
                ->orWhere('summary_en', 'like', "%{$term}%")
                ->orWhere('summary_am', 'like', "%{$term}%")
                ->orWhere('category', 'like', "%{$term}%");
        });
    }

    public function scopeFilterCategory(Builder $query, ?string $category): Builder
    {
        if (! $category || $category === 'all') {
            return $query;
        }

        return $query->where('category', $category);
    }

    public function scopeFilterTechnology(Builder $query, ?string $tech): Builder
    {
        if (! $tech || $tech === 'all') {
            return $query;
        }

        return $query->where('technologies', 'like', "%{$tech}%");
    }

    public function localizedTitle(?string $locale = null): string
    {
        $locale = $locale ?? app()->getLocale();

        if ($locale === 'am' && ! empty($this->title_am)) {
            return $this->title_am;
        }

        return $this->title_en ?? '';
    }

    public function localizedSummary(?string $locale = null): string
    {
        $locale = $locale ?? app()->getLocale();

        if ($locale === 'am' && ! empty($this->summary_am)) {
            return $this->summary_am;
        }

        return $this->summary_en ?? '';
    }

    public function localizedDescription(?string $locale = null): string
    {
        $locale = $locale ?? app()->getLocale();

        if ($locale === 'am' && ! empty($this->description_am)) {
            return $this->description_am;
        }

        return $this->description_en ?? '';
    }

    public function isTranslationComplete(): bool
    {
        return ! empty($this->title_en)
            && ! empty($this->title_am)
            && ! empty($this->summary_en)
            && ! empty($this->summary_am)
            && ! empty($this->description_en)
            && ! empty($this->description_am);
    }
}
