<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Services\ContactImportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ContactImportController extends Controller
{
    private const MAX_FILE_KILOBYTES = 5120;

    private const PREVIEW_ROWS = 25;

    public function create(Request $request)
    {
        return Inertia::render('contacts-import', [
            ...$this->pageContext($request),
            'preview' => null,
            'summary' => null,
        ]);
    }

    public function preview(Request $request, ContactImportService $service)
    {
        $request->validate([
            'file' => ['required', 'file', 'max:'.self::MAX_FILE_KILOBYTES],
        ]);

        $file = $request->file('file');
        $extension = mb_strtolower((string) $file->getClientOriginalExtension());

        if (! in_array($extension, ['csv', 'txt'], true)) {
            throw ValidationException::withMessages([
                'file' => 'Upload a .csv file exported from your previous contact list.',
            ]);
        }

        $token = (string) Str::uuid();
        Storage::disk('local')->putFileAs('contact-imports', $file, $token.'.csv');

        $parsed = $service->parse($this->absolutePath($token));

        if ($parsed['headers'] === []) {
            $this->forget($token);

            throw ValidationException::withMessages([
                'file' => 'The uploaded file does not contain a header row.',
            ]);
        }

        $mapping = $service->detectMapping($parsed['headers']);
        $analysis = $service->analyze($request->user(), $parsed['rows'], $mapping);

        return Inertia::render('contacts-import', [
            ...$this->pageContext($request),
            'preview' => [
                'token' => $token,
                'file_name' => $file->getClientOriginalName(),
                'headers' => $parsed['headers'],
                'mapping' => $mapping,
                'truncated' => $parsed['truncated'],
                'max_rows' => ContactImportService::MAX_ROWS,
                'summary' => [
                    'total' => $analysis['total'],
                    'importable' => $analysis['importable'],
                    'duplicates' => $analysis['duplicates'],
                    'invalid' => $analysis['invalid'],
                ],
                'rows' => array_slice($analysis['rows'], 0, self::PREVIEW_ROWS),
            ],
            'summary' => null,
        ]);
    }

    public function store(Request $request, ContactImportService $service)
    {
        $validated = $request->validate([
            'token' => ['required', 'uuid'],
            'mapping' => ['required', 'array'],
            'mapping.*' => ['nullable', 'string', 'max:120'],
            'duplicate_strategy' => ['required', Rule::in(ContactImportService::STRATEGIES)],
            'default_funnel_id' => ['nullable', 'integer'],
            'default_status' => ['nullable', Rule::in(Contact::STATUSES)],
            'default_source' => ['nullable', 'string', 'max:60'],
        ]);

        $token = $validated['token'];
        $path = $this->path($token);

        if (! Storage::disk('local')->exists($path)) {
            throw ValidationException::withMessages([
                'file' => 'This upload expired. Choose the CSV file again to continue.',
            ]);
        }

        $defaultFunnelId = null;

        if (! empty($validated['default_funnel_id'])) {
            $defaultFunnelId = $request->user()
                ->funnels()
                ->whereKey($validated['default_funnel_id'])
                ->value('id');

            if ($defaultFunnelId === null) {
                throw ValidationException::withMessages([
                    'default_funnel_id' => 'Choose one of your own funnels as the default.',
                ]);
            }
        }

        $mapping = array_filter(
            $validated['mapping'],
            fn ($value) => is_string($value) && trim($value) !== '',
        );

        $parsed = $service->parse($this->absolutePath($token));

        if ($mapping === [] || ! isset($mapping['email'])) {
            throw ValidationException::withMessages([
                'mapping' => 'Map an email column before importing.',
            ]);
        }

        $summary = $service->import(
            $request->user(),
            $parsed['rows'],
            $mapping,
            $validated['duplicate_strategy'],
            $defaultFunnelId,
            $validated['default_status'] ?? null,
            $validated['default_source'] ?? null,
        );

        $this->forget($token);

        return Inertia::render('contacts-import', [
            ...$this->pageContext($request),
            'preview' => null,
            'summary' => [
                ...$summary,
                'duplicate_strategy' => $validated['duplicate_strategy'],
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function pageContext(Request $request): array
    {
        return [
            'funnels' => $request->user()
                ->funnels()
                ->orderBy('name')
                ->get(['id', 'name', 'slug']),
            'statuses' => Contact::STATUSES,
            'fields' => ContactImportService::FIELDS,
            'strategies' => ContactImportService::STRATEGIES,
            'limits' => [
                'max_rows' => ContactImportService::MAX_ROWS,
                'max_file_kilobytes' => self::MAX_FILE_KILOBYTES,
            ],
        ];
    }

    private function path(string $token): string
    {
        return 'contact-imports/'.$token.'.csv';
    }

    private function absolutePath(string $token): string
    {
        return Storage::disk('local')->path($this->path($token));
    }

    private function forget(string $token): void
    {
        Storage::disk('local')->delete($this->path($token));
    }
}
