<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ClientAcquisitionConfiguration;
use App\Services\Concierge\EthioBizConcierge;
use App\Services\SiteEventRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConciergeAskController extends Controller
{
    public function __invoke(Request $request, EthioBizConcierge $concierge, ClientAcquisitionConfiguration $configuration, SiteEventRecorder $events): JsonResponse
    {
        $owner = User::configuredBusinessOwner();
        abort_unless($owner && $configuration->forOwner($owner->id)['concierge_enabled'], 404);

        $validated = $request->validate([
            'question' => ['required', 'string', 'min:2', 'max:500', 'regex:/\S/u'],
            'previous_questions' => ['sometimes', 'array', 'max:4'],
            'previous_questions.*' => ['required', 'string', 'max:300'],
            'locale' => ['nullable', 'in:en,am'],
            'session_id' => ['nullable', 'string', 'max:100'],
        ]);

        $locale = $validated['locale'] ?? app()->getLocale();
        $reply = $concierge->reply(
            trim($validated['question']),
            array_values(array_filter($validated['previous_questions'] ?? [], fn ($item) => is_string($item))),
            $locale,
        );

        $events->record(
            'concierge_question_answered',
            $request,
            ['source' => $reply['source']],
            $validated['session_id'] ?? null,
            $locale,
        );

        return response()->json($reply);
    }
}
