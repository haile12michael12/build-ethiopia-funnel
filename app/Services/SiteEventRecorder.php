<?php

namespace App\Services;

use App\Models\SiteEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class SiteEventRecorder
{
    /**
     * Privacy-conscious analytics: no names, emails, phones, or free text ever reach this table.
     *
     * @param  array<string, mixed>  $metadata
     */
    public function record(string $eventType, Request $request, array $metadata = [], ?string $sessionId = null, ?string $locale = null): ?SiteEvent
    {
        if (! in_array($eventType, SiteEvent::EVENT_TYPES, true)) {
            return null;
        }

        $sessionHash = $sessionId !== null && $sessionId !== '' ? hash('sha256', $sessionId) : null;

        if ($sessionHash && SiteEvent::query()
            ->where('event_type', $eventType)
            ->where('session_hash', $sessionHash)
            ->where('occurred_at', '>=', Carbon::today()->toDateTimeString())
            ->exists()) {
            return null;
        }

        return SiteEvent::create([
            'event_type' => $eventType,
            'session_hash' => $sessionHash,
            'path' => mb_substr((string) $request->header('referer', $request->path()), 0, 255),
            'locale' => in_array($locale, ['en', 'am'], true) ? $locale : null,
            'metadata' => $this->sanitizeMetadata($metadata),
            'occurred_at' => now(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $metadata
     * @return array<string, mixed>
     */
    private function sanitizeMetadata(array $metadata): array
    {
        $allowed = [];

        foreach (['source', 'topic', 'template_id', 'market'] as $key) {
            if (! array_key_exists($key, $metadata)) {
                continue;
            }

            $value = $metadata[$key];

            if ($key === 'template_id') {
                $allowed[$key] = is_numeric($value) ? (int) $value : null;
            } else {
                $allowed[$key] = is_string($value) ? mb_substr(preg_replace('/[^a-z0-9_]/', '', mb_strtolower($value)) ?? '', 0, 40) : null;
            }

            if ($allowed[$key] === null) {
                unset($allowed[$key]);
            }
        }

        return $allowed;
    }
}
