<?php

namespace App\Http\Controllers;

use App\Models\SiteEvent;
use App\Services\SiteEventRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SiteEventController extends Controller
{
    public function __invoke(Request $request, SiteEventRecorder $events): JsonResponse
    {
        $validated = $request->validate([
            'event' => ['required', 'string', Rule::in(SiteEvent::EVENT_TYPES)],
            'session_id' => ['nullable', 'string', 'max:100'],
            'locale' => ['nullable', 'in:en,am'],
            'template_id' => ['nullable', 'integer', 'min:1'],
            'topic' => ['nullable', 'string', 'max:40'],
        ]);

        $events->record(
            $validated['event'],
            $request,
            array_filter([
                'template_id' => $validated['template_id'] ?? null,
                'topic' => $validated['topic'] ?? null,
            ]),
            $validated['session_id'] ?? null,
            $validated['locale'] ?? app()->getLocale(),
        );

        return response()->json(['recorded' => true]);
    }
}
