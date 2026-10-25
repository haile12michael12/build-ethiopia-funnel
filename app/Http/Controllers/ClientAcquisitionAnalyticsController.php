<?php

namespace App\Http\Controllers;

use App\Models\ContactSubmission;
use App\Models\SiteEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class ClientAcquisitionAnalyticsController extends Controller
{
    public function __invoke(Request $request)
    {
        $filters = $request->validate([
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
        ]);
        $from = isset($filters['date_from']) ? Carbon::parse($filters['date_from'])->startOfDay() : now()->subDays(29)->startOfDay();
        $to = isset($filters['date_to']) ? Carbon::parse($filters['date_to'])->endOfDay() : now()->endOfDay();
        $periodContacts = $request->user()->contacts()->whereBetween('created_at', [$from, $to]);
        $statusCounts = [];
        $serviceCounts = [];
        $marketCounts = ['ethiopia' => 0, 'international' => 0];
        $budgetCounts = [];
        $scoreCounts = ['0–39' => 0, '40–69' => 0, '70–100' => 0];
        $sourceCounts = [];
        $campaignCounts = [];

        (clone $periodContacts)->select(['id', 'status', 'lead_score', 'source', 'client_project'])->chunkById(200, function ($contacts) use (
            &$statusCounts,
            &$serviceCounts,
            &$marketCounts,
            &$budgetCounts,
            &$scoreCounts,
            &$sourceCounts,
            &$campaignCounts,
        ): void {
            foreach ($contacts as $contact) {
                $statusCounts[$contact->status] = ($statusCounts[$contact->status] ?? 0) + 1;
                $project = $contact->client_project ?? [];
                $market = $project['market'] ?? null;
                if (isset($marketCounts[$market])) {
                    $marketCounts[$market]++;
                }
                foreach ($project['service_labels'] ?? [] as $service) {
                    if (is_string($service) && $service !== '') {
                        $serviceCounts[$service] = ($serviceCounts[$service] ?? 0) + 1;
                    }
                }
                $currency = $project['budget_currency'] ?? null;
                $budget = $project['budget_label'] ?? null;
                if (in_array($currency, ['ETB', 'USD'], true) && is_string($budget) && $budget !== '') {
                    $budgetCounts[$currency][$budget] = ($budgetCounts[$currency][$budget] ?? 0) + 1;
                }
                $score = (int) ($contact->lead_score ?? 0);
                $scoreBand = $score < 40 ? '0–39' : ($score < 70 ? '40–69' : '70–100');
                $scoreCounts[$scoreBand]++;

                $attribution = $project['attribution'] ?? [];
                $source = $attribution['utm_source'] ?? null;
                $campaign = $attribution['utm_campaign'] ?? null;
                if (is_string($source) && $source !== '') {
                    $sourceCounts[$source] = ($sourceCounts[$source] ?? 0) + 1;
                }
                if (is_string($campaign) && $campaign !== '') {
                    $campaignCounts[$campaign] = ($campaignCounts[$campaign] ?? 0) + 1;
                }
            }
        });

        $wonRevenue = $request->user()->opportunities()
            ->where('status', 'won')
            ->whereBetween('closed_at', [$from, $to])
            ->join('pipelines', 'opportunities.pipeline_id', '=', 'pipelines.id')
            ->selectRaw('pipelines.currency as currency, SUM(opportunities.value_cents) as amount_minor, COUNT(*) as won_count')
            ->groupBy('pipelines.currency')
            ->get()
            ->map(fn ($row) => [
                'currency' => $row->currency,
                'amount_minor' => (int) $row->amount_minor,
                'won_count' => (int) $row->won_count,
            ])
            ->values();
        $contactIds = $request->user()->contacts()->select('contacts.id');
        $totalInquiries = ContactSubmission::query()->whereIn('contact_id', $contactIds)->count();
        $newInquiries = ContactSubmission::query()
            ->whereIn('contact_id', $contactIds)
            ->whereBetween('created_at', [$from, $to])
            ->count();

        $siteEventCounts = SiteEvent::query()
            ->whereBetween('occurred_at', [$from, $to])
            ->groupBy('event_type')
            ->selectRaw('event_type, COUNT(*) as aggregate')
            ->pluck('aggregate', 'event_type')
            ->all();

        return Inertia::render('client-acquisition/analytics', [
            'filters' => ['date_from' => $from->toDateString(), 'date_to' => $to->toDateString()],
            'metrics' => [
                'total_inquiries' => $totalInquiries,
                'new_inquiries' => $newInquiries,
                'total_leads' => $request->user()->contacts()->count(),
                'qualified_leads' => (clone $periodContacts)->where('status', 'qualified')->count(),
                'status_counts' => $statusCounts,
                'service_counts' => $serviceCounts,
                'market_counts' => $marketCounts,
                'budget_counts' => $budgetCounts,
                'score_counts' => $scoreCounts,
                'source_counts' => $sourceCounts,
                'campaign_counts' => $campaignCounts,
                'overdue_tasks' => $request->user()->followUpTasks()
                    ->where('status', 'pending')
                    ->where('due_at', '<', now())
                    ->count(),
                'won_revenue' => $wonRevenue,
                'site_event_counts' => $siteEventCounts,
            ],
        ]);
    }
}
