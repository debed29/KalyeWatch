<?php

namespace App\Actions\Fortify;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    /**
     * @param  array{name: string, email: string, password: string, password_confirmation?: string}  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:users,email',
            ],
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],
        ])->validate();

        return DB::transaction(function () use ($input): User {
            $user = User::create([
                'name' => $input['name'],
                'email' => $input['email'],
                'password' => Hash::make($input['password']),
            ]);

            $team = Team::create([
                'name' => $user->name."'s Team",
                'is_personal' => true,
            ]);

            $team->members()->attach($user->id, [
                'role' => TeamRole::Owner->value,
            ]);

            $user->forceFill([
                'current_team_id' => $team->id,
            ])->save();

            return $user;
        });
    }
}
