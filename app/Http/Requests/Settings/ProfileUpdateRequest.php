<?php

namespace App\Http\Requests\Settings;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ProfileUpdateRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],

            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
        ];
    }

    /**
     * Get additional validation callbacks for the request.
     *
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $user = $this->user();
                $email = $this->input('email');

                if (! $user instanceof User || ! is_string($email)) {
                    return;
                }

                if ($user->isBusinessOwner() && mb_strtolower($email) !== mb_strtolower($user->email)) {
                    $validator->errors()->add(
                        'email',
                        'Update ADMIN_EMAIL in the server configuration before changing the owner account email.',
                    );
                }

                if (! $user->isBusinessOwner() && User::emailMatchesConfiguredOwner($email)) {
                    $validator->errors()->add(
                        'email',
                        'This email cannot be used for a customer account.',
                    );
                }
            },
        ];
    }
}
