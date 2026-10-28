<?php

namespace App\Http\Controllers;

use App\Models\BookingPage;
use DateTimeZone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class BookingPageController extends Controller
{
    public function index(Request $request): Response
    {
        $pages = $request->user()->bookingPages()
            ->withCount([
                'bookings',
                'bookings as upcoming_count' => fn ($query) => $query->where('status', 'confirmed')->where('starts_at', '>=', now()),
            ])
            ->latest()
            ->get()
            ->map(fn (BookingPage $page): array => [
                'id' => $page->id,
                'title' => $page->title,
                'slug' => $page->slug,
                'location' => $page->location,
                'duration_minutes' => $page->duration_minutes,
                'timezone' => $page->timezone,
                'is_active' => $page->is_active,
                'bookings_count' => $page->bookings_count,
                'upcoming_count' => $page->upcoming_count,
                'public_url' => $page->publicUrl(),
            ]);

        return Inertia::render('appointments/calendars', [
            'pages' => $pages,
            'durations' => config('booking.durations'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'location' => ['nullable', 'string', 'max:255'],
            'duration_minutes' => ['required', 'integer', Rule::in(config('booking.durations'))],
        ]);

        $request->user()->bookingPages()->create([
            'title' => trim($validated['title']),
            'slug' => $this->uniqueSlug($validated['title']),
            'location' => filled($validated['location'] ?? null) ? trim($validated['location']) : null,
            'duration_minutes' => (int) $validated['duration_minutes'],
            'timezone' => config('booking.default_timezone', 'Africa/Addis_Ababa'),
            // Weekday 09:00–17:00 default; refined on the edit screen.
            'availability' => [
                '1' => [['start' => '09:00', 'end' => '17:00']],
                '2' => [['start' => '09:00', 'end' => '17:00']],
                '3' => [['start' => '09:00', 'end' => '17:00']],
                '4' => [['start' => '09:00', 'end' => '17:00']],
                '5' => [['start' => '09:00', 'end' => '17:00']],
                '6' => [],
                '7' => [],
            ],
            'is_active' => true,
        ]);

        return back()->with('success', 'Booking page created. Open it to tune availability and share the public link.');
    }

    public function edit(Request $request, BookingPage $page): Response
    {
        abort_unless($page->user_id === $request->user()->id, 403);

        return Inertia::render('appointments/calendar-edit', [
            'page' => [
                'id' => $page->id,
                'title' => $page->title,
                'slug' => $page->slug,
                'description' => $page->description,
                'location' => $page->location,
                'duration_minutes' => $page->duration_minutes,
                'buffer_minutes' => $page->buffer_minutes,
                'min_notice_hours' => intdiv(max(0, $page->min_notice_minutes), 60),
                'advance_days' => $page->advance_days,
                'timezone' => $page->timezone,
                'is_active' => $page->is_active,
                'availability' => $page->normalizedAvailability(),
                'public_url' => $page->publicUrl(),
            ],
            'durations' => config('booking.durations'),
            'timezones' => config('booking.timezones'),
            'limits' => [
                'max_advance_days' => config('booking.max_advance_days'),
                'max_min_notice_hours' => config('booking.max_min_notice_hours'),
            ],
        ]);
    }

    public function update(Request $request, BookingPage $page): RedirectResponse
    {
        abort_unless($page->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:2000'],
            'location' => ['nullable', 'string', 'max:255'],
            'duration_minutes' => ['required', 'integer', Rule::in(config('booking.durations'))],
            'buffer_minutes' => ['required', 'integer', 'min:0', 'max:120'],
            'min_notice_hours' => ['required', 'integer', 'min:0', 'max:'.(int) config('booking.max_min_notice_hours', 72)],
            'advance_days' => ['required', 'integer', 'min:1', 'max:'.(int) config('booking.max_advance_days', 60)],
            'timezone' => ['required', 'string', 'max:64', Rule::in(DateTimeZone::listIdentifiers())],
            'is_active' => ['sometimes', 'boolean'],
            'availability' => ['required', 'array'],
            'availability.*' => ['array', 'max:3'],
            'availability.*.*.start' => ['required', 'date_format:H:i'],
            'availability.*.*.end' => ['required', 'date_format:H:i'],
        ]);

        $page->update([
            'title' => trim($validated['title']),
            'description' => filled($validated['description'] ?? null) ? trim($validated['description']) : null,
            'location' => filled($validated['location'] ?? null) ? trim($validated['location']) : null,
            'duration_minutes' => (int) $validated['duration_minutes'],
            'buffer_minutes' => (int) $validated['buffer_minutes'],
            'min_notice_minutes' => (int) $validated['min_notice_hours'] * 60,
            'advance_days' => (int) $validated['advance_days'],
            'timezone' => $validated['timezone'],
            'is_active' => (bool) ($validated['is_active'] ?? false),
            'availability' => $this->normalizeAvailability($validated['availability']),
        ]);

        return back()->with('success', 'Booking page updated.');
    }

    /**
     * @param  array<string, mixed>  $availability
     * @return array<string, array<int, array{start: string, end: string}>>
     *
     * @throws ValidationException
     */
    private function normalizeAvailability(array $availability): array
    {
        $normalized = [];

        foreach (range(1, 7) as $day) {
            $windows = $availability[(string) $day] ?? [];
            if (! is_array($windows)) {
                $windows = [];
            }

            $clean = [];
            foreach (array_slice($windows, 0, 3) as $window) {
                if (! is_array($window)) {
                    continue;
                }
                $start = $window['start'] ?? null;
                $end = $window['end'] ?? null;
                if (! is_string($start) || ! is_string($end)) {
                    continue;
                }
                if (strcmp($end, $start) <= 0) {
                    throw ValidationException::withMessages([
                        'availability' => 'Every availability window must end after it starts.',
                    ]);
                }
                $clean[] = ['start' => $start, 'end' => $end];
            }

            $normalized[(string) $day] = $clean;
        }

        return $normalized;
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'booking';
        $slug = $base;
        $suffix = 2;

        while (BookingPage::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
