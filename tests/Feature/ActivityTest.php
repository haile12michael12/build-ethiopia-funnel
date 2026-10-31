<?php

use App\Models\Activity;
use App\Models\User;
use Illuminate\Support\Facades\Schema;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('activity records its actor and morph subject while filtering sensitive metadata', function () {
    $user = User::factory()->create();

    Activity::record('login', $user->id, $user, [
        'channel' => 'web',
        'payment_reference' => 'private-reference',
        'nested' => ['api_token' => 'private-token', 'source' => 'customer'],
    ]);

    $activity = Activity::query()->sole();

    expect($activity->user_id)->toBe($user->id)
        ->and($activity->action)->toBe('login')
        ->and($activity->subject)->toBeInstanceOf(User::class)
        ->and($activity->meta)->toBe(['channel' => 'web', 'nested' => ['source' => 'customer']]);
});

test('activity user reference is nulled when the user is deleted', function () {
    $user = User::factory()->create();
    Activity::record('registered', $user->id, $user);

    $user->delete();

    expect(Activity::query()->sole()->user_id)->toBeNull();
});

test('activity recording failures do not escape into the request', function () {
    Schema::drop('activities');

    expect(fn () => Activity::record('login'))->not->toThrow(\Throwable::class);
});

test('activity prune command deletes only records older than twelve months', function () {
    $old = Activity::query()->create([
        'action' => 'old',
        'meta' => [],
    ]);
    $old->forceFill(['created_at' => now()->subMonths(13)])->saveQuietly();
    $recent = Activity::query()->create([
        'action' => 'recent',
        'meta' => [],
    ]);

    $this->artisan('activities:prune')->assertSuccessful();

    expect(Activity::query()->find($old->id))->toBeNull()
        ->and(Activity::query()->find($recent->id))->not->toBeNull();
});