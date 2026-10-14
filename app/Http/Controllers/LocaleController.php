<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LocaleController extends Controller
{
    /**
     * Switch application locale in user session.
     */
    public function update(Request $request, string $locale): RedirectResponse
    {
        if (in_array($locale, ['en', 'am'], true)) {
            $request->session()->put('locale', $locale);
            app()->setLocale($locale);
        }

        return back();
    }
}

