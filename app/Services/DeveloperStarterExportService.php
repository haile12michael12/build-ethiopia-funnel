<?php

namespace App\Services;

class DeveloperStarterExportService
{
    private const FEATURES = ['auth', 'api', 'forms', 'tests', 'docker'];

    /**
     * @param  array<int, string>  $features
     * @return array<string, string>
     */
    public function files(string $stack, array $features): array
    {
        $features = array_values(array_intersect(self::FEATURES, $features));
        $manifest = json_encode([
            'stack' => $stack,
            'features' => $features,
            'generated_by' => 'Hailab developer starter export',
        ], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);

        $files = [
            'README.md' => $this->readme($stack, $features),
            'starter.json' => $manifest."\n",
            '.env.example' => "APP_URL=http://localhost\nAPI_KEY=replace-with-your-own-secret\n",
        ];

        if ($stack === 'mern') {
            $files += [
                'package.json' => json_encode([
                    'name' => 'hailab-mern-starter',
                    'private' => true,
                    'type' => 'module',
                    'scripts' => ['dev' => 'vite', 'build' => 'vite build'],
                    'dependencies' => ['react' => '^19.0.0', 'react-dom' => '^19.0.0'],
                    'devDependencies' => ['@vitejs/plugin-react' => '^4.0.0', 'vite' => '^6.0.0'],
                ], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR)."\n",
                'vite.config.js' => "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({ plugins: [react()] });\n",
                'index.html' => '<!doctype html><html lang="en"><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MERN starter</title><div id="root"></div><script type="module" src="/src/main.jsx"></script></html>'."\n",
                'src/main.jsx' => "import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport './styles.css';\n\nfunction App() {\n    return <main><h1>Your MERN starter</h1><p>Replace this screen with your application.</p></main>;\n}\n\ncreateRoot(document.getElementById('root')).render(<App />);\n",
                'src/styles.css' => "body { margin: 0; font-family: system-ui, sans-serif; }\nmain { max-width: 48rem; margin: 5rem auto; padding: 1rem; }\n",
            ];
        } else {
            $files += [
                'composer.json' => json_encode([
                    'name' => 'hailab/laravel-react-starter',
                    'type' => 'project',
                    'require' => ['php' => '^8.3', 'laravel/framework' => '^13.0'],
                ], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR)."\n",
                'routes/web.php' => "<?php\n\nuse Illuminate\\Support\\Facades\\Route;\n\nRoute::view('/', 'welcome');\n",
                'resources/js/app.tsx' => "import React from 'react';\nimport { createRoot } from 'react-dom/client';\n\nfunction App() {\n    return <main><h1>Your Laravel + React starter</h1><p>Replace this screen with your application.</p></main>;\n}\n\nconst root = document.getElementById('app');\nif (root) createRoot(root).render(<App />);\n",
            ];
        }

        foreach ($features as $feature) {
            $files["docs/{$feature}.md"] = $this->featureGuide($feature);
        }

        if (in_array('docker', $features, true)) {
            $files['Dockerfile.example'] = $stack === 'mern'
                ? "# Example only. Review and customize before building an image.\nFROM node:22-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 5173\nCMD [\"npm\", \"run\", \"dev\", \"--\", \"--host\", \"0.0.0.0\"]\n"
                : "# Example only for a completed Laravel application; this scaffold is intentionally incomplete.\nFROM php:8.3-cli\nWORKDIR /app\nCOPY . .\nEXPOSE 8000\nCMD [\"php\", \"artisan\", \"serve\", \"--host=0.0.0.0\"]\n";
        }

        return $files;
    }

    /**
     * @param  array<int, string>  $features
     */
    private function readme(string $stack, array $features): string
    {
        return "# Hailab {$stack} starter\n\n"
            ."Selected options: ".($features === [] ? 'core scaffold' : implode(', ', $features)).".\n\n"
            ."This is a minimal scaffold, not a production-ready authentication, API, or deployment system. No source was executed to generate this archive. Review every file and configure your own secrets outside source control before use.\n";
    }

    private function featureGuide(string $feature): string
    {
        return match ($feature) {
            'auth' => "# Authentication integration\n\nNo authentication code or credentials are included. Select a maintained framework-supported authentication package, configure secure session handling, and add authorization tests before enabling accounts.\n",
            'api' => "# API integration\n\nDefine resource schemas, authorization rules, validation, and rate limits before implementing endpoints. Do not trust client-supplied ownership or payment state.\n",
            'forms' => "# Forms\n\nValidate data on the server, apply CSRF protection to state-changing requests, and avoid collecting sensitive fields unless necessary.\n",
            'tests' => "# Test plan\n\nAdd unit tests for business rules and feature tests for input validation, access control, and failure paths before deployment.\n",
            'docker' => "# Container notes\n\nThe included example is a starting point only. Pin dependencies and image versions, run as a non-root user, and do not bake secrets into image layers.\n",
            default => "# Optional integration\n\nReview requirements and security before implementation.\n",
        };
    }
}
