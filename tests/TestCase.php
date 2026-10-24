<?php

namespace Tests;

use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function actingAs(Authenticatable $user, $guard = null)
    {
        if ($user instanceof User && config('business.owner_email') === null) {
            config(['business.owner_email' => $user->email]);
        }

        return parent::actingAs($user, $guard);
    }
}
