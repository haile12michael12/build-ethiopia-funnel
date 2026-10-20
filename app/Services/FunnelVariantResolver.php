<?php

namespace App\Services;

use App\Models\Funnel;
use App\Models\FunnelExperiment;
use App\Models\FunnelVariant;
use Illuminate\Http\Request;

class FunnelVariantResolver
{
    /** @return array{variant:FunnelVariant|null,cookie:string,value:string} */
    public function resolve(Funnel $funnel, Request $request): array
    {
        $cookie = 'of_variant_'.$funnel->id;
        $experiment = $request->routeIs('client-acquisition.show') ? null : $funnel->experiments()
            ->where('status', 'running')
            ->where(fn ($query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn ($query) => $query->whereNull('ends_at')->orWhere('ends_at', '>', now()))
            ->latest('id')
            ->first();
        if ($experiment && $experiment->isAcceptingTraffic()) {
            return $this->resolveExperiment($funnel, $experiment, $request, $cookie);
        }

        $managedVariantIds = $funnel->experiments()
            ->get(['allocations'])
            ->flatMap(fn (FunnelExperiment $item) => $item->assignedVariantIds())
            ->unique()
            ->values();
        $variants = $funnel->variants()
            ->where('is_active', true)
            ->whereNotIn('id', $managedVariantIds->all())
            ->orderBy('id')
            ->get();
        $selected = $variants->firstWhere('id', (int) $request->cookie($cookie));

        if (! $selected && $variants->isNotEmpty()) {
            $roll = random_int(1, 100);
            $cursor = 0;
            foreach ($variants as $variant) {
                $cursor += $variant->weight;
                if ($roll <= min(100, $cursor)) {
                    $selected = $variant;
                    break;
                }
            }
        }

        return [
            'variant' => $selected,
            'cookie' => $cookie,
            'value' => $selected ? (string) $selected->id : 'control',
            'experiment_id' => null,
            'experiment_cookie' => 'of_experiment_'.$funnel->id,
            'experiment_cookie_value' => 'none',
        ];
    }

    /**
     * @return array{variant:FunnelVariant|null,cookie:string,value:string,experiment_id:int,experiment_cookie:string,experiment_cookie_value:string}
     */
    private function resolveExperiment(Funnel $funnel, FunnelExperiment $experiment, Request $request, string $cookie): array
    {
        $experimentCookie = 'of_experiment_'.$funnel->id;
        $variants = $funnel->variants()
            ->whereIn('id', $experiment->assignedVariantIds())
            ->orderBy('id')
            ->get()
            ->keyBy('id');
        $allocation = collect($experiment->allocations ?? []);
        $assignedValue = (string) $request->cookie($experimentCookie, '');
        $selectedId = null;
        if (str_starts_with($assignedValue, $experiment->id.':')) {
            $assignedVariant = substr($assignedValue, strlen((string) $experiment->id) + 1);
            if ($assignedVariant === 'control') {
                $selectedId = null;
            } elseif (ctype_digit($assignedVariant) && $allocation->contains(fn (array $item) => (int) $item['variant_id'] === (int) $assignedVariant)) {
                $selectedId = (int) $assignedVariant;
            }
        } else {
            $roll = random_int(1, 100);
            $cursor = 0;
            foreach ($allocation as $item) {
                $cursor += (int) $item['weight'];
                if ($roll <= $cursor) {
                    $selectedId = (int) $item['variant_id'];
                    break;
                }
            }
        }

        $variant = $selectedId === null ? null : $variants->get($selectedId);
        if ($selectedId !== null && ! $variant) {
            $selectedId = null;
        }
        $value = $selectedId === null ? 'control' : (string) $selectedId;

        return [
            'variant' => $variant,
            'cookie' => $cookie,
            'value' => $value,
            'experiment_id' => $experiment->id,
            'experiment_cookie' => $experimentCookie,
            'experiment_cookie_value' => $experiment->id.':'.$value,
        ];
    }
}
