<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Incident extends Model
{
    /** @return HasMany<IncidentStatusHistory, $this> */
    public function statusHistories(): HasMany
    {
        return $this->hasMany(IncidentStatusHistory::class)
            ->orderBy('created_at');
    }

    protected $fillable = [
        'category',
        'incident_date',
        'incident_time',
        'description',
        'location_description',
        'latitude',
        'longitude',
    ];

    protected function casts(): array
    {
        return [
            'incident_date' => 'date',
            'incident_time' => 'string',
            'latitude' => 'float',
            'longitude' => 'float',
            'reviewed_at' => 'datetime',
            'verified_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
