<?php

namespace App\Http\Controllers;

use App\Models\Funnel;
use App\Services\FunnelSupportChatAssistant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FunnelSupportChatController extends Controller
{
    public function __invoke(Request $request, Funnel $funnel, FunnelSupportChatAssistant $assistant): JsonResponse
    {
        abort_unless($funnel->is_published, 404);

        $validated = $request->validate([
            'question' => ['required', 'string', 'min:1', 'max:1000', 'regex:/\S/u'],
            'previous_questions' => ['sometimes', 'array', 'max:5'],
            'previous_questions.*' => ['required', 'string', 'max:500'],
            'variant_id' => ['nullable', 'integer', 'min:1'],
        ]);

        $content = $funnel->content ?? [];
        if (isset($validated['variant_id'])) {
            $variant = $funnel->variants()->where('is_active', true)->find($validated['variant_id']);
            abort_unless($variant, 404);
            $content = $variant->content ?? $content;
        }

        return response()->json($assistant->reply(
            $funnel,
            $content,
            trim($validated['question']),
            $validated['previous_questions'] ?? [],
        ));
    }
}
