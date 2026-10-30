<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Throwable;

class Activity extends Model
{
    protected $fillable = [
        'user_id',
        'action',
        'meta',
        'ip',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    public static function record(string $action, ?int $userId = null, ?Model $subject = null, array $meta = []): void
    {
        try {
            $activity = new static([
                'user_id' => $userId,
                'action' => $action,
                'meta' => static::safeMeta($meta),
                'ip' => request()->ip(),
            ]);

            if ($subject) {
                $activity->subject()->associate($subject);
            }

            $activity->save();
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    private static function safeMeta(array $meta): array
    {
        $safe = [];

        foreach ($meta as $key => $value) {
            if (preg_match('/token|secret|password|authorization|amount|currency|transaction|payment|card/i', (string) $key)) {
                continue;
            }

            if (is_array($value)) {
                $safe[$key] = static::safeMeta($value);
            } elseif (is_scalar($value) || $value === null) {
                $safe[$key] = $value;
            }
        }

        return $safe;
    }
}