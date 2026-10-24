<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('account/index', [
            'profile' => $user->only(['name', 'email']),
            'order_count' => $user->marketplacePurchases()->count(),
            'paid_order_count' => $user->marketplacePurchases()->where('status', 'paid')->count(),
        ]);
    }
}
