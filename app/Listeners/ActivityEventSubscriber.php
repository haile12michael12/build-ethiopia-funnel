<?php

namespace App\Listeners;

use App\Models\Activity;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Registered;
use Illuminate\Events\Dispatcher;

class ActivityEventSubscriber
{
    public function handleLogin(Login $event): void
    {
        Activity::record('login', (int) $event->user->getAuthIdentifier(), $event->user);
    }

    public function handleRegistered(Registered $event): void
    {
        Activity::record('registered', (int) $event->user->getAuthIdentifier(), $event->user);
    }

    public function subscribe(Dispatcher $events): void
    {
        $events->listen(Login::class, [self::class, 'handleLogin']);
        $events->listen(Registered::class, [self::class, 'handleRegistered']);
    }
}