<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PortfolioController extends Controller
{
    /**
     * Display public portfolio listing of published projects.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $category = $request->string('category')->trim()->value();
        $tech = $request->string('tech')->trim()->value();
        $ownerId = User::configuredBusinessOwner()?->id ?? 0;

        $featured = Project::query()
            ->where('user_id', $ownerId)
            ->published()
            ->featured()
            ->ordered()
            ->take(3)
            ->get();

        $projects = Project::query()
            ->where('user_id', $ownerId)
            ->published()
            ->when($search, fn ($q) => $q->search($search))
            ->when($category && $category !== 'all', fn ($q) => $q->filterCategory($category))
            ->when($tech && $tech !== 'all', fn ($q) => $q->filterTechnology($tech))
            ->ordered()
            ->paginate(9)
            ->withQueryString();

        return Inertia::render('portfolio/index', [
            'projects' => $projects,
            'featured' => $featured,
            'categories' => Project::CATEGORIES,
            'filters' => [
                'search' => $search,
                'category' => $category ?: 'all',
                'tech' => $tech ?: 'all',
            ],
        ]);
    }

    /**
     * Display the public detail page for a published project.
     */
    public function show(Project $project): Response
    {
        abort_unless(
            $project->user_id === (User::configuredBusinessOwner()?->id ?? 0) &&
            $project->is_published &&
            $project->status === 'published' &&
            $project->published_at !== null &&
            $project->published_at->isPast(),
            404,
            'Project not found or not published.'
        );

        $relatedProjects = Project::query()
            ->where('user_id', $project->user_id)
            ->published()
            ->where('id', '!=', $project->id)
            ->where('category', $project->category)
            ->ordered()
            ->take(3)
            ->get();

        return Inertia::render('portfolio/show', [
            'project' => $project,
            'relatedProjects' => $relatedProjects,
            'categories' => Project::CATEGORIES,
            'previewMode' => false,
        ]);
    }
}
