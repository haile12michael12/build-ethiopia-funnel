<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $validCategories = array_keys(Project::CATEGORIES);

        return [
            'title_en' => ['required', 'string', 'max:255'],
            'title_am' => ['nullable', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:projects,slug'],
            'summary_en' => ['nullable', 'string', 'max:2000'],
            'summary_am' => ['nullable', 'string', 'max:2000'],
            'description_en' => ['nullable', 'string'],
            'description_am' => ['nullable', 'string'],
            'category' => ['required', 'string', Rule::in($validCategories)],
            'cover_image_file' => ['nullable', 'file', 'image', 'mimes:jpeg,png,jpg,webp,gif,svg', 'max:5120'],
            'cover_image' => ['nullable', 'string', 'max:2048'],
            'gallery_files' => ['nullable', 'array', 'max:10'],
            'gallery_files.*' => ['file', 'image', 'mimes:jpeg,png,jpg,webp,gif,svg', 'max:5120'],
            'gallery' => ['nullable', 'array'],
            'gallery.*' => ['string', 'max:2048'],
            'technologies' => ['nullable', 'array'],
            'technologies.*' => ['string', 'max:100'],
            'demo_url' => ['nullable', 'url', 'max:2048'],
            'repo_url' => ['nullable', 'url', 'max:2048'],
            'video_url' => ['nullable', 'url', 'max:2048'],
            'status' => ['nullable', 'string', Rule::in(['draft', 'published', 'archived'])],
            'is_published' => ['nullable', 'boolean'],
            'is_featured' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'published_at' => ['nullable', 'date'],
            'seo_title_en' => ['nullable', 'string', 'max:255'],
            'seo_title_am' => ['nullable', 'string', 'max:255'],
            'seo_description_en' => ['nullable', 'string', 'max:300'],
            'seo_description_am' => ['nullable', 'string', 'max:300'],
        ];
    }
}
