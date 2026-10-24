<?php

namespace App\Http\Controllers;

use App\Models\MarketplaceTemplate;
use App\Models\Project;
use App\Models\SiteContent;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SiteContentController extends Controller
{
    private const LABELS = [
        'service' => 'Services',
        'blog' => 'Blog Posts',
        'testimonial' => 'Testimonials',
        'page' => 'Pages',
    ];

    public function index(Request $request, string $type): Response
    {
        $this->ensureType($type);
        $entries = $request->user()->siteContents()->where('type', $type)
            ->when($request->string('search')->trim()->value(), function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('title_en', 'like', "%{$search}%")
                        ->orWhere('title_am', 'like', "%{$search}%")
                        ->orWhere('slug', 'like', "%{$search}%");
                });
            })
            ->orderBy('sort_order')
            ->orderByDesc('updated_at')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('site-content/index', [
            'type' => $type,
            'label' => self::LABELS[$type],
            'entries' => $entries,
            'search' => $request->string('search')->trim()->value(),
        ]);
    }

    public function create(string $type): Response
    {
        $this->ensureType($type);

        return Inertia::render('site-content/form', [
            'type' => $type,
            'label' => self::LABELS[$type],
            'entry' => null,
        ]);
    }

    public function store(Request $request, string $type): RedirectResponse
    {
        $this->ensureType($type);
        $validated = $this->validatedContent($request, $type);
        $this->storeImage($request, $validated);
        $validated['slug'] = $this->uniqueSlug(($validated['slug'] ?? '') ?: $validated['title_en']);
        $validated['type'] = $type;
        $validated['status'] = $validated['status'] ?? 'draft';
        $validated['published_at'] = $validated['status'] === 'published'
            ? ($validated['published_at'] ?? now())
            : null;

        $request->user()->siteContents()->create($validated);

        return redirect()->route('site-content.index', $type)->with('success', self::LABELS[$type].' item created.');
    }

    public function edit(Request $request, string $type, int $entry): Response
    {
        $this->ensureType($type);
        $content = $this->ownedEntry($request, $type, $entry);

        return Inertia::render('site-content/form', [
            'type' => $type,
            'label' => self::LABELS[$type],
            'entry' => $content,
        ]);
    }

    public function update(Request $request, string $type, int $entry): RedirectResponse
    {
        $this->ensureType($type);
        $content = $this->ownedEntry($request, $type, $entry);
        $validated = $this->validatedContent($request, $type, $content);
        $this->storeImage($request, $validated);
        $validated['slug'] = $this->uniqueSlug(($validated['slug'] ?? '') ?: $validated['title_en'], $content->id);
        $validated['status'] = $validated['status'] ?? $content->status;
        $validated['published_at'] = $validated['status'] === 'published'
            ? ($validated['published_at'] ?? $content->published_at ?? now())
            : null;

        $content->update($validated);

        return redirect()->route('site-content.index', $type)->with('success', self::LABELS[$type].' item updated.');
    }

    public function destroy(Request $request, string $type, int $entry): RedirectResponse
    {
        $this->ensureType($type);
        $this->ownedEntry($request, $type, $entry)->delete();

        return back()->with('success', self::LABELS[$type].' item deleted.');
    }

    public function services(): Response
    {
        return Inertia::render('services', [
            'services' => $this->businessContent('service')->published()->ordered()->get(),
            'seoPage' => $this->businessContent('page')->where('slug', 'services')->published()->first(),
        ]);
    }

    public function home(): Response
    {
        $homePage = $this->businessContent('page')->where('slug', 'home')->published()->first();
        if ($homePage) {
            return Inertia::render('site-content/show', ['content' => $homePage]);
        }

        $ownerId = User::configuredBusinessOwner()?->id ?? 0;

        return Inertia::render('welcome', [
            'services' => $this->businessContent('service')
                ->published()
                ->ordered()
                ->limit(4)
                ->get(['id', 'title_en', 'title_am', 'summary_en', 'summary_am', 'slug']),
            'projects' => Project::query()
                ->where('user_id', $ownerId)
                ->published()
                ->featured()
                ->ordered()
                ->limit(3)
                ->get(['id', 'title_en', 'title_am', 'slug', 'summary_en', 'summary_am', 'cover_image']),
            'products' => MarketplaceTemplate::query()
                ->businessStore()
                ->where('status', 'published')
                ->orderBy('name')
                ->limit(3)
                ->get(['id', 'slug', 'name', 'description', 'amount_minor', 'currency', 'preview_images'])
                ->map(fn (MarketplaceTemplate $product): array => [
                    'id' => $product->id,
                    'slug' => $product->slug,
                    'name' => $product->name,
                    'description' => $product->description,
                    'amount_minor' => $product->amount_minor,
                    'currency' => $product->currency,
                    'image' => isset($product->preview_images[0])
                        ? Storage::disk('public')->url($product->preview_images[0])
                        : null,
                ]),
            'testimonials' => $this->homeTestimonials(),
        ]);
    }

    public function blog(): Response
    {
        return Inertia::render('blog', [
            'articles' => $this->businessContent('blog')->published()->ordered()->paginate(10),
            'seoPage' => $this->businessContent('page')->where('slug', 'blog')->published()->first(),
        ]);
    }

    public function blogShow(SiteContent $content): Response
    {
        abort_unless($this->isBusinessContent($content) && $content->type === 'blog' && $this->isPublished($content), 404);

        return Inertia::render('site-content/show', ['content' => $content]);
    }

    public function namedPage(string $slug): Response
    {
        $content = $this->businessContent('page')->where('slug', $slug)->published()->first();
        if ($content) {
            return Inertia::render('site-content/show', ['content' => $content]);
        }

        abort_unless(in_array($slug, ['about', 'contact'], true), 404);

        return Inertia::render($slug);
    }

    public function page(SiteContent $content): Response
    {
        abort_unless($this->isBusinessContent($content) && $content->type === 'page' && $this->isPublished($content), 404);

        return Inertia::render('site-content/show', ['content' => $content]);
    }

    public function homeTestimonials(): array
    {
        return $this->businessContent('testimonial')->published()->ordered()->get()->all();
    }

    private function businessContent(string $type): Builder
    {
        return SiteContent::query()
            ->where('user_id', User::configuredBusinessOwner()?->id ?? 0)
            ->where('type', $type);
    }

    private function isBusinessContent(SiteContent $content): bool
    {
        return $content->user_id === (User::configuredBusinessOwner()?->id ?? 0);
    }

    private function validatedContent(Request $request, string $type, ?SiteContent $content = null): array
    {
        $requiredBody = ['blog', 'page', 'service', 'testimonial'];

        return $request->validate([
            'title_en' => ['required', 'string', 'max:255'],
            'title_am' => ['nullable', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('site_contents', 'slug')->ignore($content?->id)],
            'summary_en' => ['nullable', 'string', 'max:2000'],
            'summary_am' => ['nullable', 'string', 'max:2000'],
            'body_en' => [in_array($type, $requiredBody, true) ? 'required' : 'nullable', 'string'],
            'body_am' => ['nullable', 'string'],
            'image' => ['nullable', 'string', 'max:2048'],
            'image_file' => ['nullable', 'file', 'image', 'mimes:jpeg,png,jpg,webp,gif', 'max:5120'],
            'category' => ['nullable', 'string', 'max:100'],
            'highlights_en' => ['nullable', 'array', 'max:20'],
            'highlights_en.*' => ['string', 'max:200'],
            'highlights_am' => ['nullable', 'array', 'max:20'],
            'highlights_am.*' => ['string', 'max:200'],
            'person_name_en' => [$type === 'testimonial' ? 'required' : 'nullable', 'string', 'max:255'],
            'person_name_am' => ['nullable', 'string', 'max:255'],
            'person_role_en' => ['nullable', 'string', 'max:255'],
            'person_role_am' => ['nullable', 'string', 'max:255'],
            'company_en' => ['nullable', 'string', 'max:255'],
            'company_am' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'string', Rule::in(['draft', 'published', 'archived'])],
            'published_at' => ['nullable', 'date'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'seo_title_en' => ['nullable', 'string', 'max:255'],
            'seo_title_am' => ['nullable', 'string', 'max:255'],
            'seo_description_en' => ['nullable', 'string', 'max:300'],
            'seo_description_am' => ['nullable', 'string', 'max:300'],
        ]);
    }

    private function storeImage(Request $request, array &$validated): void
    {
        if ($request->hasFile('image_file')) {
            $path = $request->file('image_file')->store('site-content', 'public');
            $validated['image'] = Storage::disk('public')->url($path);
        }

        unset($validated['image_file']);
    }

    private function uniqueSlug(string $value, ?int $ignoreId = null): string
    {
        $base = Str::slug($value) ?: 'content';
        $slug = $base;
        $suffix = 1;

        while (SiteContent::query()->where('slug', $slug)->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))->exists()) {
            $slug = $base.'-'.(++$suffix);
        }

        return $slug;
    }

    private function ownedEntry(Request $request, string $type, int $entry): SiteContent
    {
        return $request->user()->siteContents()->where('type', $type)->findOrFail($entry);
    }

    private function ensureType(string $type): void
    {
        abort_unless(in_array($type, SiteContent::TYPES, true), 404);
    }

    private function isPublished(SiteContent $content): bool
    {
        return $content->status === 'published' && $content->published_at !== null && $content->published_at->isPast();
    }
}
