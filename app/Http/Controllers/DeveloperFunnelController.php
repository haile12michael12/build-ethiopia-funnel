<?php

namespace App\Http\Controllers;

use App\Models\Funnel;
use App\Services\DeveloperFunnelInstaller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class DeveloperFunnelController extends Controller
{
    use AuthorizesRequests;

    public function store(Request $request, DeveloperFunnelInstaller $installer)
    {
        $this->authorize('create', Funnel::class);

        $funnel = $installer->installFor($request->user());

        return redirect()->route('funnel-editor.edit', $funnel)
            ->with('success', 'MERN developer funnel pages and experiment are ready. Review the nurture draft before publishing it.');
    }
}
