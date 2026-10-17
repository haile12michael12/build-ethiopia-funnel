<?php

namespace App\Services\Marketplace;

use App\Models\MarketplaceTemplate;
use App\Models\User;

class MarketplaceAccessService
{
    public function hasAccess(User $user, MarketplaceTemplate $template): bool
    {
        if ($template->owner_id === $user->id) {
            return true;
        }

        if ($template->workspace_id && $template->workspace?->members()->whereKey($user->id)->exists()) {
            return true;
        }

        if ($template->amount_minor === 0) {
            return true;
        }

        if ($user->marketplacePurchases()
            ->where('status', 'paid')
            ->where(function ($query) use ($template): void {
                $query->where('template_id', $template->id)
                    ->orWhereIn('template_id', $template->bundles()->select('marketplace_templates.id'));
            })
            ->exists()) {
            return true;
        }

        return $user->marketplacePurchases()
            ->where('status', 'paid')
            ->whereHas('template.bundleItems', fn ($query) => $query->whereKey($template->id))
            ->exists();
    }
}
