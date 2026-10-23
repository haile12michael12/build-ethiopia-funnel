<?php

namespace App\Services;

use App\Models\Contact;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use SplFileObject;

/**
 * Parses, previews, and commits CSV contact imports with per-owner de-duplication.
 */
class ContactImportService
{
    /** Canonical importable fields, in a stable display order. */
    public const FIELDS = ['email', 'name', 'phone', 'status', 'source', 'funnel', 'tags'];

    public const STRATEGIES = ['skip', 'update'];

    public const DEFAULT_SOURCE = 'csv_import';

    /** Upper bound on parsed data rows to keep memory predictable. */
    public const MAX_ROWS = 5000;

    private const FIELD_ALIASES = [
        'email' => ['email', 'e_mail', 'email_address', 'emailaddress', 'mail', 'email_id'],
        'name' => ['name', 'full_name', 'fullname', 'contact_name', 'contact', 'first_last_name'],
        'phone' => ['phone', 'phone_number', 'telephone', 'tel', 'mobile', 'mobile_number', 'contact_number'],
        'status' => ['status', 'lead_status', 'stage'],
        'source' => ['source', 'lead_source', 'origin'],
        'funnel' => ['funnel', 'funnel_name', 'funnel_slug', 'campaign'],
        'tags' => ['tags', 'tag', 'labels'],
    ];

    /**
     * Parse a CSV file into normalized headers and associative rows.
     *
     * @return array{headers: list<array{key: string, label: string}>, rows: list<array<string, string>>, truncated: bool}
     */
    public function parse(string $absolutePath): array
    {
        $file = new SplFileObject($absolutePath, 'rb');
        $file->setFlags(SplFileObject::READ_CSV | SplFileObject::SKIP_EMPTY | SplFileObject::DROP_NEW_LINE);
        $file->setCsvControl($this->detectDelimiter($absolutePath));

        $headers = [];
        $rows = [];
        $truncated = false;

        foreach ($file as $line) {
            if (! is_array($line) || $this->isBlank($line)) {
                continue;
            }

            if ($headers === []) {
                $line[0] = $this->stripBom((string) ($line[0] ?? ''));
                $headers = $this->normalizeHeaders($line);

                continue;
            }

            if (count($rows) >= self::MAX_ROWS) {
                $truncated = true;
                break;
            }

            $rows[] = $this->mapRow($headers, $line);
        }

        return ['headers' => $headers, 'rows' => $rows, 'truncated' => $truncated];
    }

    /**
     * Auto-detect a canonical field => header key mapping from the parsed headers.
     *
     * @param  list<array{key: string, label: string}>  $headers
     * @return array<string, string>
     */
    public function detectMapping(array $headers): array
    {
        $available = array_column($headers, 'key');
        $mapping = [];

        foreach (self::FIELDS as $field) {
            foreach (self::FIELD_ALIASES[$field] as $alias) {
                $index = array_search($alias, $available, true);

                if ($index !== false) {
                    $mapping[$field] = $available[$index];
                    $available[$index] = null;

                    break;
                }
            }
        }

        return $mapping;
    }

    /**
     * Classify rows as importable, duplicate, or invalid without writing anything.
     *
     * @param  list<array<string, string>>  $rows
     * @param  array<string, string>  $mapping
     * @return array{total: int, importable: int, duplicates: int, invalid: int, rows: list<array<string, mixed>>}
     */
    public function analyze(User $user, array $rows, array $mapping): array
    {
        $existing = $user->contacts()->pluck('email')
            ->map(fn (?string $email) => mb_strtolower((string) $email))
            ->flip()
            ->all();

        $seen = [];
        $classified = [];
        $importable = 0;
        $duplicates = 0;
        $invalid = 0;

        foreach ($rows as $index => $row) {
            $record = $this->normalizeRow($row, $mapping);
            $data = $record['data'];
            $issues = $record['issues'];
            $status = 'ok';

            if ($issues !== []) {
                $status = 'invalid';
                $invalid++;
            } else {
                $email = $data['email'];

                if (isset($seen[$email]) || array_key_exists($email, $existing)) {
                    $status = 'duplicate';
                    $duplicates++;
                } else {
                    $importable++;
                }

                $seen[$email] = true;
            }

            $classified[] = [
                'row' => $index + 1,
                'status' => $status,
                'issues' => $issues,
                'email' => $data['email'] ?? null,
                'name' => $data['name'] ?? null,
                'phone' => $data['phone'] ?? null,
                'values' => $data,
            ];
        }

        return [
            'total' => count($rows),
            'importable' => $importable,
            'duplicates' => $duplicates,
            'invalid' => $invalid,
            'rows' => $classified,
        ];
    }

    /**
     * Commit an import for the owning user.
     *
     * @param  list<array<string, string>>  $rows
     * @param  array<string, string>  $mapping
     * @return array{created: int, updated: int, skipped: int, invalid: int, total: int, errors: list<array{row: int, issues: list<string>}>}
     */
    public function import(
        User $user,
        array $rows,
        array $mapping,
        string $strategy,
        ?int $defaultFunnelId = null,
        ?string $defaultStatus = null,
        ?string $defaultSource = null,
    ): array {
        $strategy = in_array($strategy, self::STRATEGIES, true) ? $strategy : 'skip';
        $usage = $this->usage($user);
        $result = [
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'invalid' => 0,
            'total' => count($rows),
            'errors' => [],
        ];

        DB::transaction(function () use ($user, $rows, $mapping, $strategy, $defaultFunnelId, $defaultStatus, $defaultSource, $usage, &$result): void {
            $existing = $user->contacts()->get()->keyBy(fn (Contact $contact) => mb_strtolower((string) $contact->email));
            $handled = [];

            foreach ($rows as $index => $row) {
                $record = $this->normalizeRow($row, $mapping);
                $data = $record['data'];

                if ($record['issues'] !== []) {
                    $result['invalid']++;
                    $result['errors'][] = ['row' => $index + 1, 'issues' => $record['issues']];

                    continue;
                }

                $email = $data['email'];

                if (isset($handled[$email])) {
                    $result['skipped']++;

                    continue;
                }

                $handled[$email] = true;
                $funnelId = $this->resolveFunnelId($data['funnel'] ?? null, $usage['funnels']) ?? $defaultFunnelId;
                $tags = $this->parseTags($data['tags'] ?? null);
                $status = $this->resolveStatus($data['status'] ?? null, $defaultStatus);
                $source = $this->resolveSource($data['source'] ?? null, $defaultSource);
                $extra = $this->extraFields($row, $mapping);

                /** @var Contact|null $contact */
                $contact = $existing->get($email);

                if ($contact) {
                    if ($strategy === 'skip') {
                        $result['skipped']++;

                        continue;
                    }

                    $contact->fill(array_filter([
                        'name' => $data['name'] ?? null,
                        'phone' => $data['phone'] ?? null,
                        'status' => $status,
                        'source' => $source,
                    ], fn ($value) => $value !== null && $value !== ''));

                    if ($funnelId !== null) {
                        $contact->funnel_id = $funnelId;
                    }

                    if ($tags !== []) {
                        $contact->tags = array_values(array_unique([...($contact->tags ?? []), ...$tags]));
                    }

                    $contact->metadata = [
                        ...($contact->metadata ?? []),
                        'imported_at' => now()->toIso8601String(),
                        'import_source' => self::DEFAULT_SOURCE,
                        ...($extra === [] ? [] : ['imported_fields' => $extra]),
                    ];
                    $contact->save();

                    $contact->activities()->create([
                        'actor_user_id' => $user->id,
                        'type' => 'imported',
                        'payload' => ['source' => self::DEFAULT_SOURCE, 'mode' => 'updated'],
                    ]);
                    $result['updated']++;

                    continue;
                }

                $contact = $user->contacts()->create([
                    'funnel_id' => $funnelId,
                    'email' => $email,
                    'name' => $data['name'] ?? null,
                    'phone' => $data['phone'] ?? null,
                    'source' => $source ?? self::DEFAULT_SOURCE,
                    'status' => $status ?? 'new',
                    'tags' => $tags === [] ? null : $tags,
                    'metadata' => [
                        'imported_at' => now()->toIso8601String(),
                        'import_source' => self::DEFAULT_SOURCE,
                        ...($extra === [] ? [] : ['imported_fields' => $extra]),
                    ],
                ]);

                $contact->activities()->create([
                    'actor_user_id' => $user->id,
                    'type' => 'imported',
                    'payload' => ['source' => self::DEFAULT_SOURCE, 'mode' => 'created'],
                ]);
                $existing->put($email, $contact);
                $result['created']++;
            }
        });

        return $result;
    }

    /**
     * Preload the user's funnels for name/slug/id resolution.
     *
     * @return array{funnels: array<string, int>}
     */
    private function usage(User $user): array
    {
        $funnels = [];

        foreach ($user->funnels()->get(['id', 'name', 'slug']) as $funnel) {
            $funnels[mb_strtolower($funnel->name)] = $funnel->id;
            $funnels[mb_strtolower($funnel->slug)] = $funnel->id;
            $funnels[(string) $funnel->id] = $funnel->id;
        }

        return ['funnels' => $funnels];
    }

    /**
     * @param  array<string, string>  $row
     * @param  array<string, string>  $mapping
     * @return array{data: array<string, ?string>, issues: list<string>}
     */
    private function normalizeRow(array $row, array $mapping): array
    {
        $data = [];
        $issues = [];

        foreach (self::FIELDS as $field) {
            $headerKey = $mapping[$field] ?? null;
            $value = $headerKey !== null ? trim((string) ($row[$headerKey] ?? '')) : '';
            $data[$field] = $value === '' ? null : $value;
        }

        $email = $data['email'];

        if ($email === null) {
            $issues[] = 'Missing email address.';
        } elseif (mb_strlen($email) > 255 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $issues[] = 'Invalid email address.';
        } else {
            $data['email'] = mb_strtolower($email);
        }

        if (($data['phone'] ?? null) !== null && ! preg_match('/^[+]?[\d\s().-]{7,30}$/', $data['phone'])) {
            $data['phone'] = null;
        }

        if (($data['name'] ?? null) !== null) {
            $data['name'] = mb_substr($data['name'], 0, 255);
        }

        if (($data['source'] ?? null) !== null) {
            $data['source'] = mb_substr($data['source'], 0, 60);
        }

        return ['data' => $data, 'issues' => $issues];
    }

    /**
     * @param  array<string, string>  $row
     * @param  array<string, string>  $mapping
     * @return array<string, string>
     */
    private function extraFields(array $row, array $mapping): array
    {
        $mapped = array_values($mapping);
        $extra = [];

        foreach ($row as $key => $value) {
            if (in_array($key, $mapped, true)) {
                continue;
            }

            $trimmed = trim((string) $value);

            if ($trimmed !== '') {
                $extra[$key] = mb_substr($trimmed, 0, 500);
            }
        }

        return $extra;
    }

    /**
     * @param  array<string, int>  $funnels
     */
    private function resolveFunnelId(?string $value, array $funnels): ?int
    {
        if ($value === null) {
            return null;
        }

        return $funnels[mb_strtolower(trim($value))] ?? null;
    }

    private function resolveStatus(?string $value, ?string $default): ?string
    {
        if ($value !== null) {
            $status = mb_strtolower(trim($value));

            if (in_array($status, Contact::STATUSES, true)) {
                return $status;
            }
        }

        return in_array($default, Contact::STATUSES, true) ? $default : null;
    }

    private function resolveSource(?string $value, ?string $default): ?string
    {
        if ($value !== null) {
            return mb_substr(trim($value), 0, 60);
        }

        return $default !== null && trim($default) !== '' ? mb_substr(trim($default), 0, 60) : null;
    }

    /**
     * @return list<string>
     */
    private function parseTags(?string $value): array
    {
        if ($value === null) {
            return [];
        }

        $tags = preg_split('/[,;|]/', $value) ?: [];

        return collect($tags)
            ->map(fn (string $tag) => mb_substr(trim($tag), 0, 60))
            ->filter(fn (string $tag) => $tag !== '')
            ->unique()
            ->take(20)
            ->values()
            ->all();
    }

    /**
     * @param  list<array{key: string, label: string}>  $headers
     * @return list<array{key: string, label: string}>
     */
    private function normalizeHeaders(array $line): array
    {
        $used = [];
        $headers = [];

        foreach (array_values($line) as $index => $label) {
            $label = trim($this->stripBom((string) $label));
            $key = preg_replace('/[^a-z0-9]+/', '_', mb_strtolower($label)) ?? '';
            $key = trim($key, '_');

            if ($key === '') {
                $key = 'column_'.($index + 1);
            }

            $base = $key;
            $suffix = 2;

            while (in_array($key, $used, true)) {
                $key = $base.'_'.$suffix;
                $suffix++;
            }

            $used[] = $key;
            $headers[] = ['key' => $key, 'label' => $label !== '' ? $label : $key];
        }

        return $headers;
    }

    /**
     * @param  list<array{key: string, label: string}>  $headers
     * @param  list<string|null>  $line
     * @return array<string, string>
     */
    private function mapRow(array $headers, array $line): array
    {
        $row = [];

        foreach ($headers as $index => $header) {
            $row[$header['key']] = trim((string) ($line[$index] ?? ''));
        }

        return $row;
    }

    private function detectDelimiter(string $absolutePath): string
    {
        $handle = fopen($absolutePath, 'rb');

        if ($handle === false) {
            return ',';
        }

        $line = (string) fgets($handle);
        fclose($handle);

        $candidates = [
            ',' => substr_count($line, ','),
            ';' => substr_count($line, ';'),
            "\t" => substr_count($line, "\t"),
        ];

        arsort($candidates);
        $delimiter = (string) array_key_first($candidates);

        return $candidates[$delimiter] > 0 ? $delimiter : ',';
    }

    /**
     * @param  list<string|null>  $line
     */
    private function isBlank(array $line): bool
    {
        foreach ($line as $value) {
            if ($value !== null && trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }

    private function stripBom(string $value): string
    {
        return preg_replace('/^\xEF\xBB\xBF/', '', $value) ?? $value;
    }
}
