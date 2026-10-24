<?php

namespace App\Services\Marketplace;

use App\Models\MarketplaceTemplate;
use App\Models\User;

class MarketplaceAccessService
{
    public function hasAccess(User $user, MarketplaceTemplate $template): bool
    {
        if ($user->isBusinessOwner() && MarketplaceTemplate::query()->businessStore()->whereKey($template->id)->exists()) {
            return true;
        }

        if ($template->amount_minor === 0 && $template->status === 'published') {
            return true;
        }

        return $this->hasPaidPurchase($user, $template);
    }

    public function hasPaidPurchase(User $user, MarketplaceTemplate $template): bool
    {
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
