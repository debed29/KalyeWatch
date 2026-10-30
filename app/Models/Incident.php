<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Incident extends Model
{
    protected $fillable = [
        'category',
        'incident_date',
        'incident_time',
        'description',
        'location_description',
        'latitude',
        'longitude',
    ];

    /**
     * Cast database values into their appropriate PHP types.
     */
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

    /**
     * Get all evidence images attached to this incident.
     *
     * @return HasMany<IncidentImage, $this>
     */
    public function images(): HasMany
    {
        return $this->hasMany(IncidentImage::class);
    }

    /**
     * Get the status history of this incident.
     *
     * @return HasMany<IncidentStatusHistory, $this>
     */
    public function statusHistories(): HasMany
    {
        return $this->hasMany(IncidentStatusHistory::class)
            ->orderBy('created_at');
    }

    /**
     * Get the user who submitted this incident.
     *
     * @return BelongsTo<User, $this>
     */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the administrator who reviewed this incident.
     *
     * @return BelongsTo<User, $this>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
