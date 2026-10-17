<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;
use ZipArchive;

class DeveloperCodeAuditAnalyzer
{
    private const MAX_FILES = 80;

    private const MAX_FILE_BYTES = 131072;

    private const MAX_TOTAL_BYTES = 1572864;

    private const ALLOWED_EXTENSIONS = [
        'php', 'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'py', 'html', 'css', 'scss', 'json', 'yml', 'yaml', 'toml', 'md',
    ];

    /**
     * Analyze an uploaded ZIP in memory. No files are extracted or executed.
     *
     * @return array{score:int,files_analyzed:int,files_skipped:int,findings:array<int,array{severity:string,title:string,path:string,line:int|null,detail:string}>,limitations:array<int,string>}
     */
    public function analyzeZip(string $archivePath): array
    {
        if (! class_exists(ZipArchive::class)) {
            throw new \RuntimeException('ZIP audit support is unavailable on this server.');
        }

        $zip = new ZipArchive;
        $opened = $zip->open($archivePath, ZipArchive::CHECKCONS);
        if ($opened !== true) {
            throw ValidationException::withMessages(['archive' => 'Upload a valid ZIP archive.']);
        }

        $findings = [];
        $filesAnalyzed = 0;
        $filesSkipped = 0;
        $totalBytes = 0;
        try {
            if ($zip->numFiles > self::MAX_FILES) {
                throw ValidationException::withMessages(['archive' => 'The archive may contain at most 80 entries.']);
            }

            for ($index = 0; $index < $zip->numFiles; $index++) {
                $stat = $zip->statIndex($index);
                $name = $zip->getNameIndex($index);
                if (! is_array($stat) || ! is_string($name)) {
                    throw ValidationException::withMessages(['archive' => 'The archive contains an unreadable entry.']);
                }

                if ($this->isUnsafePath($name) || $this->isSymlink($zip, $index)) {
                    throw ValidationException::withMessages(['archive' => 'The archive contains an unsafe path or symbolic link.']);
                }
                if (str_ends_with($name, '/')) {
                    continue;
                }

                $path = $this->normalizePath($name);
                $size = (int) ($stat['size'] ?? 0);
                if ($size > self::MAX_FILE_BYTES) {
                    throw ValidationException::withMessages(['archive' => 'Each archive file must be 128 KB or smaller.']);
                }
                $totalBytes += $size;
                if ($totalBytes > self::MAX_TOTAL_BYTES) {
                    throw ValidationException::withMessages(['archive' => 'The total uncompressed archive size may not exceed 1.5 MB.']);
                }

                if ($this->isExcludedPath($path)) {
                    $filesSkipped++;

                    continue;
                }

                if (
                    preg_match('/(^|\/)\.env(?:\..*)?$/i', $path)
                    && ! preg_match('/^\.env\.(?:example|sample)$/i', basename($path))
                ) {
                    $findings[] = [
                        'severity' => 'high',
                        'title' => 'Environment file included in archive',
                        'path' => $path,
                        'line' => null,
                        'detail' => 'Environment files can contain credentials. Remove them from shared source archives; their contents were not inspected or stored.',
                    ];
                    $filesSkipped++;

                    continue;
                }

                $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
                if (! in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
                    $filesSkipped++;

                    continue;
                }

                $contents = $zip->getFromIndex($index);
                if (! is_string($contents) || strlen($contents) !== $size || str_contains($contents, "\0")) {
                    $filesSkipped++;

                    continue;
                }

                $filesAnalyzed++;
                $findings = [...$findings, ...$this->scanFile($path, $contents)];
            }
        } finally {
            $zip->close();
        }

        if ($filesAnalyzed === 0) {
            throw ValidationException::withMessages(['archive' => 'The ZIP must contain at least one supported text source file.']);
        }

        $penalties = ['critical' => 30, 'high' => 18, 'medium' => 8, 'low' => 3];
        $score = max(0, 100 - array_sum(array_map(
            fn (array $finding): int => $penalties[$finding['severity']] ?? 0,
            $findings,
        )));

        return [
            'score' => $score,
            'files_analyzed' => $filesAnalyzed,
            'files_skipped' => $filesSkipped,
            'findings' => array_slice($findings, 0, 100),
            'limitations' => [
                'This is a bounded, pattern-based static review of supported text files, not a complete security or quality audit.',
                'No submitted code was executed, dependencies installed, or repository/network resources fetched.',
                'Findings can be false positives or miss issues; manually review the source and run trusted tests and scanners before deployment.',
            ],
        ];
    }

    private function scanFile(string $path, string $contents): array
    {
        $findings = [];
        $rules = [
            [
                'pattern' => '/\b(?:api[_-]?key|client[_-]?secret|password|secret|access[_-]?token)\b\s*[:=]\s*["\'][^"\'\r\n]{8,}["\']/i',
                'severity' => 'critical',
                'title' => 'Possible hard-coded credential',
                'detail' => 'A credential-like assignment was found. Rotate any real secret and load credentials from a server-side secret store.',
            ],
            [
                'pattern' => '/\b(?:eval\s*\(|new\s+Function\s*\()/i',
                'severity' => 'high',
                'title' => 'Dynamic code construction',
                'detail' => 'Dynamic code construction can execute untrusted input. Confirm the matched pattern is necessary and safely constrained.',
            ],
            [
                'pattern' => '/\b(?:shell_exec|system|passthru|proc_open)\s*\(/i',
                'severity' => 'high',
                'title' => 'Process execution call',
                'detail' => 'A process-execution API was detected. Review its input sources and use an allowlisted, non-shell API where possible.',
            ],
            [
                'pattern' => '/\b(?:console\.log|debugger\s*;|var_dump\s*\(|\bdd\s*\()/i',
                'severity' => 'low',
                'title' => 'Debug statement',
                'detail' => 'A common debug statement was detected and may expose implementation details in production.',
            ],
        ];

        foreach ($rules as $rule) {
            if (preg_match_all($rule['pattern'], $contents, $matches, PREG_OFFSET_CAPTURE) === false) {
                continue;
            }
            foreach ($matches[0] as [, $offset]) {
                $line = substr_count(substr($contents, 0, $offset), "\n") + 1;
                $findings[] = [
                    'severity' => $rule['severity'],
                    'title' => $rule['title'],
                    'path' => $path,
                    'line' => $line,
                    'detail' => $rule['detail'],
                ];
                if (count($findings) >= 20) {
                    return $findings;
                }
            }
        }

        return $findings;
    }

    private function normalizePath(string $path): string
    {
        return str_replace('\\', '/', $path);
    }

    private function isUnsafePath(string $path): bool
    {
        $normalized = $this->normalizePath($path);

        return strlen($normalized) > 240
            || str_starts_with($normalized, '/')
            || preg_match('/^[A-Za-z]:/', $normalized) === 1
            || preg_match('~(^|/)\.\.(?:/|$)~', $normalized) === 1
            || str_contains($normalized, "\0");
    }

    private function isSymlink(ZipArchive $zip, int $index): bool
    {
        $opsys = 0;
        $attributes = 0;
        if (! $zip->getExternalAttributesIndex($index, $opsys, $attributes)) {
            return false;
        }

        return (($attributes >> 16) & 0170000) === 0120000;
    }

    private function isExcludedPath(string $path): bool
    {
        if (preg_match('~(^|/)(?:vendor|node_modules|\.git|dist|build|coverage)(?:/|$)~i', $path)) {
            return true;
        }

        return preg_match('/(?:package-lock|pnpm-lock|yarn\.lock|composer\.lock)\b/i', basename($path)) === 1;
    }
}
