<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserRoleHistory extends Model
{
    // The audit table only has created_at, not updated_at.
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'user_name',
        'user_email',
        'actor_user_id',
        'actor_name',
        'actor_email',
        'old_role',
        'new_role',
        'reason',
    ];

    /**
     * Get the account whose role was changed.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the administrator who performed the change.
     *
     * @return BelongsTo<User, $this>
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }

    /**
     * Cast the audit creation date.
     */
    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }
}
