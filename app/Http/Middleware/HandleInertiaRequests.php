<?php

namespace App\Http\Middleware;

use App\Models\BookingPage;
use App\Models\User;
use App\Services\ClientAcquisitionConfiguration;
use Closure;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;
use Symfony\Component\HttpFoundation\Response;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Apply the visitor's session locale before controllers run so
     * page content and shared translations render in that language.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->session()->get('locale', config('app.locale', 'en'));
        if (in_array($locale, ['en', 'am'], true)) {
            app()->setLocale($locale);
        }

        return parent::handle($request, $next);
    }

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    private function conciergeEnabled(): bool
    {
        return Cache::remember('shared:concierge-enabled', 60, function (): bool {
            $owner = User::configuredBusinessOwner();

            if (! $owner) {
                return false;
            }

            return (bool) app(ClientAcquisitionConfiguration::class)->forOwner($owner->id)['concierge_enabled'];
        });
    }

    private function appointmentBookingEnabled(): bool
    {
        return Cache::remember('shared:appointment-booking-enabled', 60, function (): bool {
            $owner = User::configuredBusinessOwner();

            if (! $owner) {
                return false;
            }

            $settings = app(ClientAcquisitionConfiguration::class)->forOwner($owner->id);

            return (bool) ($settings['appointment_enabled'] ?? true) && (bool) config('appointments.enabled', true);
        });
    }

    private function bookingCtaUrl(): ?string
    {
        return Cache::remember('shared:booking-cta-url', 60, function (): ?string {
            $slug = BookingPage::query()->where('is_active', true)->orderBy('id')->value('slug');

            return is_string($slug) ? route('booking.show', ['page' => $slug]) : null;
        });
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'locale' => app()->getLocale(),
            'translations' => [
                'navigation' => trans('navigation'),
                'copilot' => trans('copilot'),
                'client_acquisition' => trans('client-acquisition'),
                'concierge' => trans('concierge'),
            ],
            'concierge' => [
                'enabled' => $this->conciergeEnabled(),
            ],
            'appointments' => [
                'booking_enabled' => $this->appointmentBookingEnabled(),
            ],
            'bookingCtaUrl' => fn () => $this->bookingCtaUrl(),
            'auth' => [
                'user' => $request->user(),
                'is_business_owner' => $request->user()?->isBusinessOwner() ?? false,
            ],
            'demo' => [
                'enabled' => (bool) config('demo.enabled'),
                'active' => (bool) $request->user()?->is_demo,
                'expires_at' => $request->user()?->demo_expires_at?->toISOString(),
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'domain' => fn () => $request->session()->get('domain'),
                'workspace_invite_url' => fn () => $request->session()->get('workspace_invite_url'),
            ],
            'ziggy' => fn (): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
