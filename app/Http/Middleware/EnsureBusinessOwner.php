<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureBusinessOwner
{
    private const CUSTOMER_DASHBOARD_ROUTES = [
        'contacts.index',
        'contacts.lookup',
        'contacts.export',
        'contacts.import.create',
        'contacts.import.preview',
        'contacts.import.store',
        'contacts.show',
        'contacts.update',
        'contacts.details.update',
        'contacts.notes.store',
        'contacts.contact-attempts.store',
        'contacts.website-assessments.store',
        'contacts.website-assessments.inspect',
        'contacts.website-assessments.destroy',
        'follow-up-tasks.index',
        'follow-up-tasks.store',
        'follow-up-tasks.update',
        'appointments.index',
        'appointments.update',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $routeName = $request->route()?->getName();

        abort_unless(
            $user?->isBusinessOwner()
                || ($user && in_array($routeName, self::CUSTOMER_DASHBOARD_ROUTES, true)),
            403,
        );

        return $next($request);
    }
}
