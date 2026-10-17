<?php

namespace App\Http\Controllers;

use App\Models\DeveloperAuditReport;
use App\Services\DeveloperProductSignalRecorder;
use App\Services\DeveloperStarterExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

class DeveloperToolsController extends Controller
{
    private const FEATURES = ['auth', 'api', 'forms', 'tests', 'docker'];

    public function index(): \Inertia\Response
    {
        return \Inertia\Inertia::render('developer-tools', [
            'playgroundUrl' => route('developer-tools.playground'),
            'exportUrl' => route('developer-tools.export'),
        ]);
    }

    public function simulate(Request $request, DeveloperProductSignalRecorder $signals): JsonResponse
    {
        $validated = $request->validate([
            'stack' => ['required', Rule::in(['mern', 'laravel-react'])],
            'features' => ['nullable', 'array', 'max:5'],
            'features.*' => ['required', 'string', 'distinct', Rule::in(self::FEATURES)],
        ]);

        $report = $this->sessionReport($request);
        if ($report) {
            $signals->record($report->contact, 'playground_simulated', $report->id);
        }

        return response()->json([
            'simulation' => [
                'stack' => $validated['stack'],
                'selected_features' => array_values($validated['features'] ?? []),
                'steps' => [
                    'Configuration validated locally',
                    'Starter files would be assembled for '.implode(', ', $validated['features'] ?? ['the core scaffold']),
                    'No submitted or generated code was executed',
                ],
                'status' => 'simulation_only',
            ],
        ]);
    }

    public function export(
        Request $request,
        DeveloperStarterExportService $exporter,
        DeveloperProductSignalRecorder $signals,
    ): BinaryFileResponse {
        $validated = $request->validate([
            'stack' => ['required', Rule::in(['mern', 'laravel-react'])],
            'features' => ['nullable', 'array', 'max:5'],
            'features.*' => ['required', 'string', 'distinct', Rule::in(self::FEATURES)],
        ]);

        $files = $exporter->files($validated['stack'], $validated['features'] ?? []);
        $path = tempnam(sys_get_temp_dir(), 'hailab-starter-');
        if ($path === false) {
            throw new \RuntimeException('Could not create a temporary starter archive.');
        }

        $zip = new ZipArchive;
        if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            @unlink($path);
            throw new \RuntimeException('Could not initialize the starter archive.');
        }

        try {
            foreach ($files as $file => $contents) {
                if (! $zip->addFromString($file, $contents)) {
                    throw new \RuntimeException('Could not add a file to the starter archive.');
                }
            }
        } catch (\Throwable $exception) {
            $zip->close();
            @unlink($path);
            throw $exception;
        }
        if (! $zip->close()) {
            @unlink($path);
            throw new \RuntimeException('Could not finalize the starter archive.');
        }

        $report = $this->sessionReport($request);
        if ($report) {
            $signals->record($report->contact, 'starter_exported', $report->id);
        }

        return response()->download(
            $path,
            'hailab-'.$validated['stack'].'-starter.zip',
            ['Content-Type' => 'application/zip', 'Cache-Control' => 'private, no-store'],
        )->deleteFileAfterSend();
    }

    private function sessionReport(Request $request): ?DeveloperAuditReport
    {
        $id = $request->session()->get('developer_audit_report_id');
        if (! is_numeric($id)) {
            return null;
        }

        return DeveloperAuditReport::query()
            ->with('contact')
            ->whereKey((int) $id)
            ->where('expires_at', '>', now())
            ->whereNotNull('unlocked_at')
            ->first();
    }
}
