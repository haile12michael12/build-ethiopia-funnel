<?php

namespace App\Http\Controllers;

use App\Models\MarketplacePurchase;
use App\Models\MarketplaceTemplate;
use App\Models\User;
use App\Models\Workspace;
use App\Services\Marketplace\ChapaPaymentGateway;
use App\Services\Marketplace\MarketplaceAccessService;
use App\Services\Marketplace\MarketplacePurchaseService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MarketplaceController extends Controller
{
    public function index(Request $request): Response
    {
        $products = MarketplaceTemplate::query()
            ->where('status', 'published')
            ->with('owner:id,name')
            ->orderBy('type')
            ->orderBy('name')
            ->get();

        return Inertia::render('marketplace/index', [
            'products' => $products->map(fn (MarketplaceTemplate $product): array => $this->present($product)),
            'canReview' => $this->canReview($request->user()),
            'authenticated' => (bool) $request->user(),
            'mySubmissions' => $request->user()
                ? $request->user()->marketplaceTemplates()->latest()->get()->map(fn (MarketplaceTemplate $product): array => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'slug' => $product->slug,
                    'status' => $product->status,
                    'type' => $product->type,
                ])
                : [],
            'workspaces' => $request->user()
                ? Workspace::query()
                    ->where('owner_id', $request->user()->id)
                    ->orWhereHas('members', fn ($query) => $query->whereKey($request->user()->id)
                        ->whereIn('workspace_members.role', ['owner', 'admin', 'editor']))
                    ->orderBy('name')
                    ->get(['id', 'name'])
                : [],
        ]);
    }

    public function show(Request $request, MarketplaceTemplate $template): Response
    {
        abort_unless($template->status === 'published', 404);

        $template->load(['owner:id,name', 'bundleItems:id,name,slug,type,amount_minor,currency']);
        $access = $request->user() && app(MarketplaceAccessService::class)->hasAccess($request->user(), $template);

        return Inertia::render('marketplace/show', [
            'product' => $this->present($template),
            'authenticated' => (bool) $request->user(),
            'hasAccess' => (bool) $access,
            'checkoutEnabled' => app(ChapaPaymentGateway::class)->configured()
                && $template->type !== 'membership'
                && $template->amount_minor !== null
                && $template->amount_minor > 0
                && ($template->type !== 'template' || filled($template->file_path)),
        ]);
    }

    public function submit(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'type' => ['required', Rule::in(['template', 'bundle', 'membership'])],
            'name' => ['required', 'string', 'max:150'],
            'description' => ['required', 'string', 'max:5000'],
            'tech_stack' => ['required', 'array', 'min:1', 'max:20'],
            'tech_stack.*' => ['required', 'string', 'max:50'],
            'included_modules' => ['required', 'array', 'min:1', 'max:30'],
            'included_modules.*' => ['required', 'string', 'max:100'],
            'version' => ['required', 'string', 'max:50'],
            'changelog' => ['nullable', 'string', 'max:5000'],
            'license' => ['required', 'string', 'max:100'],
            'workspace_id' => ['nullable', 'integer', 'exists:workspaces,id'],
        ]);

        $workspace = isset($validated['workspace_id'])
            ? Workspace::query()->findOrFail($validated['workspace_id'])
            : null;
        if ($workspace) {
            abort_unless(in_array($workspace->roleFor($request->user()), ['owner', 'admin', 'editor'], true), 403);
        }

        $slug = Str::slug($validated['name']);
        if (MarketplaceTemplate::query()->where('slug', $slug)->exists()) {
            $slug = $slug.'-'.Str::lower(Str::random(6));
        }

        $request->user()->marketplaceTemplates()->create([
            ...$validated,
            'workspace_id' => $workspace?->id,
            'slug' => $slug,
            'currency' => 'ETB',
            'status' => 'pending_review',
            'contributor_revenue_share_percent' => config('marketplace.default_revenue_share_percent', 70),
        ]);

        return to_route('marketplace.index')->with('success', 'Your submission is queued for marketplace review.');
    }

    public function reviewerIndex(Request $request): Response
    {
        abort_unless($this->canReview($request->user()), 403);

        return Inertia::render('marketplace/review', [
            'products' => MarketplaceTemplate::query()->with('owner:id,name,email')->withCount('bundleItems')->latest()->get()->map(fn (MarketplaceTemplate $product): array => [
                ...$this->present($product),
                'owner' => $product->owner?->only(['name', 'email']),
                'file_configured' => filled($product->file_path),
                'revenue_share_percent' => $product->contributor_revenue_share_percent,
                'bundle_item_count' => $product->bundle_items_count,
            ]),
            'bundleOptions' => MarketplaceTemplate::query()->where('status', 'published')->where('type', 'template')
                ->get(['id', 'name'])->map(fn (MarketplaceTemplate $template): array => $template->only(['id', 'name'])),
        ]);
    }

    public function review(Request $request, MarketplaceTemplate $template): RedirectResponse
    {
        abort_unless($this->canReview($request->user()), 403);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['published', 'rejected'])],
            'amount' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'currency' => ['required', 'string', 'size:3', 'alpha:ascii'],
            'license' => ['required', 'string', 'max:100'],
            'contributor_revenue_share_percent' => ['required', 'numeric', 'min:0', 'max:90'],
            'bundle_template_ids' => ['nullable', 'array', 'max:50'],
            'bundle_template_ids.*' => [
                'integer',
                Rule::exists('marketplace_templates', 'id')->where('status', 'published')->where('type', 'template'),
            ],
            'file' => ['nullable', 'file', 'mimes:zip', 'max:102400'],
            'preview_images' => ['nullable', 'array', 'max:4'],
            'preview_images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $filePath = $template->file_path;
        if ($request->hasFile('file')) {
            $filePath = $request->file('file')->store("marketplace/{$template->slug}", 'local');
        }

        $previewImages = $template->preview_images ?? [];
        foreach ($request->file('preview_images', []) as $image) {
            $previewImages[] = $image->store("marketplace/{$template->slug}/previews", 'public');
        }

        $bundleIds = array_values(array_unique($validated['bundle_template_ids'] ?? []));
        if ($validated['status'] === 'published') {
            if ($template->type === 'template' && ! $filePath) {
                throw ValidationException::withMessages([
                    'file' => 'Upload the private ZIP artifact before publishing this template.',
                ]);
            }
            if ($template->type === 'bundle' && $bundleIds === [] && ! $template->bundleItems()->exists()) {
                throw ValidationException::withMessages([
                    'bundle_template_ids' => 'Select at least one published template for this bundle.',
                ]);
            }
        }

        $amountMinor = $validated['amount'] === null || $validated['amount'] === ''
            ? null
            : (int) round((float) $validated['amount'] * 100);

        $template->update([
            'status' => $validated['status'],
            'amount_minor' => $amountMinor,
            'currency' => strtoupper($validated['currency']),
            'license' => $validated['license'],
            'contributor_revenue_share_percent' => $validated['contributor_revenue_share_percent'],
            'file_path' => $filePath,
            'preview_images' => $previewImages,
        ]);

        if ($template->type === 'bundle' && $bundleIds !== []) {
            $template->bundleItems()->sync($bundleIds);
        }

        return to_route('marketplace.review.index')->with('success', 'Marketplace listing updated.');
    }

    public function checkout(Request $request, MarketplaceTemplate $template, ChapaPaymentGateway $gateway): RedirectResponse
    {
        abort_unless($template->status === 'published', 404);
        abort_if($template->type === 'membership', 422, 'Recurring membership checkout is not enabled.');
        abort_if($template->amount_minor === null || $template->amount_minor <= 0, 422, 'This listing does not have a paid price configured.');
        abort_if($template->type === 'template' && ! $template->file_path, 422, 'This template is not available for purchase yet.');
        abort_unless($gateway->configured(), 503, 'Marketplace checkout is not configured yet.');

        if (app(MarketplaceAccessService::class)->hasAccess($request->user(), $template)) {
            return to_route('marketplace.download', $template);
        }

        $purchase = MarketplacePurchase::query()
            ->where('buyer_id', $request->user()->id)
            ->where('template_id', $template->id)
            ->where('status', 'pending')
            ->latest()
            ->first();
        if (! $purchase) {
            $purchase = MarketplacePurchase::query()->create([
                'buyer_id' => $request->user()->id,
                'template_id' => $template->id,
                'tx_ref' => 'MKT-'.Str::upper(Str::ulid()),
                'amount_minor' => $template->amount_minor,
                'currency' => $template->currency,
                'contributor_share_percent' => $template->owner_id ? $template->contributor_revenue_share_percent : 0,
                'status' => 'pending',
            ]);
        }

        if ($purchase->checkout_url) {
            return redirect()->away($purchase->checkout_url);
        }

        try {
            $checkoutUrl = $gateway->initialize($purchase);
        } catch (HttpException $exception) {
            $purchase->update(['status' => 'failed']);
            throw $exception;
        }

        $purchase->update(['checkout_url' => $checkoutUrl]);

        return redirect()->away($checkoutUrl);
    }

    public function checkoutReturn(
        Request $request,
        MarketplacePurchaseService $purchases,
    ): RedirectResponse {
        $validated = $request->validate(['tx_ref' => ['required', 'string', 'max:100']]);
        $purchase = MarketplacePurchase::query()
            ->with('template')
            ->where('tx_ref', $validated['tx_ref'])
            ->where('buyer_id', $request->user()->id)
            ->firstOrFail();

        if (
            $purchase->status === 'paid'
            || (in_array($purchase->status, ['pending', 'failed'], true) && $purchases->verifyAndFulfill($purchase))
        ) {
            return to_route('marketplace.show', $purchase->template)
                ->with('success', 'Payment verified. Your marketplace access is ready.');
        }

        return to_route('marketplace.show', $purchase->template)
            ->with('error', 'Payment has not been confirmed yet. No access has been granted.');
    }

    public function download(Request $request, MarketplaceTemplate $template)
    {
        abort_unless($template->status === 'published' || $template->owner_id === $request->user()->id, 404);
        abort_unless(app(MarketplaceAccessService::class)->hasAccess($request->user(), $template), 403);
        abort_unless($template->type === 'template' && $template->file_path, 404);
        abort_unless(Storage::disk('local')->exists($template->file_path), 404);

        return Storage::disk('local')->download($template->file_path, "{$template->slug}.zip");
    }

    private function canReview(?User $user): bool
    {
        return $user !== null && in_array(
            mb_strtolower($user->email),
            array_map('mb_strtolower', config('marketplace.reviewer_emails', [])),
            true,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function present(MarketplaceTemplate $product): array
    {
        return [
            'id' => $product->id,
            'slug' => $product->slug,
            'type' => $product->type,
            'name' => $product->name,
            'description' => $product->description,
            'preview_images' => array_map(
                fn (string $image): string => str_starts_with($image, '/')
                    ? $image
                    : Storage::disk('public')->url($image),
                $product->preview_images ?? [],
            ),
            'tech_stack' => $product->tech_stack ?? [],
            'amount_minor' => $product->amount_minor,
            'currency' => $product->currency,
            'included_modules' => $product->included_modules ?? [],
            'version' => $product->version,
            'changelog' => $product->changelog,
            'license' => $product->license,
            'contributor' => $product->owner?->name,
            'contributor_badge' => $product->owner
                ? $product->owner->marketplaceTemplates()->where('status', 'published')->count() >= 3
                : false,
            'bundle_items' => $product->relationLoaded('bundleItems')
                ? $product->bundleItems->map(fn (MarketplaceTemplate $item): array => $item->only(['id', 'name', 'slug', 'type', 'amount_minor', 'currency']))->all()
                : [],
        ];
    }
}
