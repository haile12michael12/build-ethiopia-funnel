<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    protected $model = Project::class;

    public function definition(): array
    {
        $title = fake()->sentence(3);

        return [
            'user_id' => User::factory(),
            'title_en' => $title,
            'title_am' => 'የሙከራ ፕሮጀክት ርዕስ',
            'slug' => Str::slug($title).'-'.fake()->unique()->numberBetween(100, 9999),
            'summary_en' => fake()->paragraph(2),
            'summary_am' => 'ይህ በኢትዮጵያ ውስጥ የተሰራ የሙከራ ፕሮጀክት ማጠቃለያ ነው።',
            'description_en' => fake()->paragraphs(3, true),
            'description_am' => 'ይህ የፕሮጀክቱ ዝርዝር መግለጫ ሲሆን ሁሉንም ገጽታዎች ያካትታል።',
            'category' => fake()->randomElement(array_keys(Project::CATEGORIES)),
            'cover_image' => null,
            'gallery' => [],
            'technologies' => ['Laravel', 'React', 'TypeScript', 'Tailwind CSS'],
            'demo_url' => fake()->url(),
            'repo_url' => 'https://github.com/example/repo',
            'video_url' => null,
            'status' => 'draft',
            'is_published' => false,
            'is_featured' => false,
            'sort_order' => 0,
            'published_at' => null,
        ];
    }

    public function published(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'published',
            'is_published' => true,
            'published_at' => now()->subDay(),
        ]);
    }

    public function featured(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_featured' => true,
        ]);
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'draft',
            'is_published' => false,
            'published_at' => null,
        ]);
    }
}
