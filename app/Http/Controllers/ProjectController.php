<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Models\Project;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of projects for the authenticated user.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Project::class);

        $user = $request->user();

        $search = $request->string('search')->trim()->value();
        $category = $request->string('category')->trim()->value();
        $status = $request->string('status')->trim()->value();

        $query = $user->projects()
            ->when($search, fn ($q) => $q->search($search))
            ->when($category && $category !== 'all', fn ($q) => $q->filterCategory($category))
            ->when($status && $status !== 'all', fn ($q) => $q->where('status', $status))
            ->orderBy('sort_order', 'asc')
            ->orderByDesc('updated_at');

        $projects = $query->paginate(12)->withQueryString();

        $stats = [
            'total_projects' => $user->projects()->count(),
            'published_projects' => $user->projects()->where('is_published', true)->count(),
            'draft_projects' => $user->projects()->where('status', 'draft')->count(),
            'featured_projects' => $user->projects()->where('is_featured', true)->count(),
        ];

        return Inertia::render('projects/index', [
            'projects' => $projects,
            'filters' => [
                'search' => $search,
                'category' => $category ?: 'all',
                'status' => $status ?: 'all',
            ],
            'categories' => Project::CATEGORIES,
            'stats' => $stats,
        ]);
    }

    /**
     * Show the form for creating a new project.
     */
    public function create(): Response
    {
        $this->authorize('create', Project::class);

        return Inertia::render('projects/form', [
            'project' => null,
            'categories' => Project::CATEGORIES,
        ]);
    }

    /**
     * Store a newly created project.
     */
    public function store(StoreProjectRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        // Handle cover image upload
        if ($request->hasFile('cover_image_file')) {
            $path = $request->file('cover_image_file')->store('projects/covers', 'public');
            $validated['cover_image'] = Storage::disk('public')->url($path);
        }

        // Handle gallery images uploads
        $gallery = $validated['gallery'] ?? [];
        if ($request->hasFile('gallery_files')) {
            foreach ($request->file('gallery_files') as $file) {
                $path = $file->store('projects/gallery', 'public');
                $gallery[] = Storage::disk('public')->url($path);
            }
        }
        $validated['gallery'] = $gallery;

        // Ensure unique slug
        $titleForSlug = $validated['title_en'] ?? 'project';
        $slug = ! empty($validated['slug']) ? $validated['slug'] : $titleForSlug;
        $validated['slug'] = Project::generateUniqueSlug($slug);

        // Normalize status & published_at
        $status = $validated['status'] ?? 'draft';
        $validated['status'] = $status;
        $validated['is_published'] = ($status === 'published');
        if ($validated['is_published'] && empty($validated['published_at'])) {
            $validated['published_at'] = now();
        }

        unset($validated['cover_image_file'], $validated['gallery_files']);

        $user->projects()->create($validated);

        return redirect()->route('projects.index')->with('success', 'Project created successfully.');
    }

    /**
     * Show the form for editing the specified project.
     */
    public function edit(Project $project): Response
    {
        $this->authorize('update', $project);

        return Inertia::render('projects/form', [
            'project' => $project,
            'categories' => Project::CATEGORIES,
        ]);
    }

    /**
     * Update the specified project.
     */
    public function update(UpdateProjectRequest $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validated();

        // Handle cover image upload
        if ($request->hasFile('cover_image_file')) {
            $path = $request->file('cover_image_file')->store('projects/covers', 'public');
            $validated['cover_image'] = Storage::disk('public')->url($path);
        }

        // Handle gallery images uploads
        $gallery = $validated['gallery'] ?? ($project->gallery ?? []);
        if ($request->hasFile('gallery_files')) {
            foreach ($request->file('gallery_files') as $file) {
                $path = $file->store('projects/gallery', 'public');
                $gallery[] = Storage::disk('public')->url($path);
            }
        }
        $validated['gallery'] = array_values(array_filter($gallery));

        // Ensure unique slug if modified
        if (! empty($validated['slug']) && $validated['slug'] !== $project->slug) {
            $validated['slug'] = Project::generateUniqueSlug($validated['slug'], $project->id);
        } elseif (empty($validated['slug'])) {
            $validated['slug'] = Project::generateUniqueSlug($validated['title_en'] ?? $project->title_en, $project->id);
        }

        // Normalize status & published_at
        $status = $validated['status'] ?? $project->status;
        $validated['status'] = $status;
        $validated['is_published'] = ($status === 'published');
        if ($validated['is_published'] && empty($validated['published_at'])) {
            $validated['published_at'] = $project->published_at ?? now();
        }

        unset($validated['cover_image_file'], $validated['gallery_files']);

        $project->update($validated);

        return redirect()->route('projects.index')->with('success', 'Project updated successfully.');
    }

    /**
     * Remove the specified project from storage.
     */
    public function destroy(Project $project): RedirectResponse
    {
        $this->authorize('delete', $project);

        $project->delete();

        return redirect()->route('projects.index')->with('success', 'Project deleted successfully.');
    }

    /**
     * Publish a project immediately.
     */
    public function publish(Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $project->update([
            'status' => 'published',
            'is_published' => true,
            'published_at' => $project->published_at ?? now(),
        ]);

        return back()->with('success', 'Project published successfully.');
    }

    /**
     * Unpublish a project (return to draft).
     */
    public function unpublish(Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $project->update([
            'status' => 'draft',
            'is_published' => false,
        ]);

        return back()->with('success', 'Project moved to drafts.');
    }

    /**
     * Archive a project.
     */
    public function archive(Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $project->update([
            'status' => 'archived',
            'is_published' => false,
        ]);

        return back()->with('success', 'Project archived.');
    }

    /**
     * Preview an unpublished or draft project.
     */
    public function preview(Project $project): Response
    {
        $this->authorize('view', $project);

        return Inertia::render('portfolio/show', [
            'project' => $project,
            'relatedProjects' => [],
            'categories' => Project::CATEGORIES,
            'previewMode' => true,
        ]);
    }
}
