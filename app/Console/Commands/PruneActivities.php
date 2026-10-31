<?php

namespace App\Console\Commands;

use App\Models\Activity;
use Illuminate\Console\Command;

class PruneActivities extends Command
{
    protected $signature = 'activities:prune';

    protected $description = 'Remove activity records older than twelve months';

    public function handle(): int
    {
        $deleted = Activity::query()
            ->where('created_at', '<', now()->subMonths(12))
            ->delete();

        $this->info("Pruned {$deleted} activity records.");

        return self::SUCCESS;
    }
}