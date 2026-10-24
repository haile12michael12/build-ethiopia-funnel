<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('registration screen can be rendered', function () {
    $response = $this->get('/register');

    $response->assertStatus(200);
});

test('new users can register', function () {
    config(['business.owner_email' => 'owner@example.com']);

    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'role' => 'admin',
        'is_admin' => true,
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('account.index', absolute: false));
    expect(\App\Models\User::query()->where('email', 'test@example.com')->firstOrFail()->isBusinessOwner())->toBeFalse();
});
