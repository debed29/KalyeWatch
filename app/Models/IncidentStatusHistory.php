<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidentStatusHistory extends Model
{
    protected $fillable = [
        'incident_id',
        'changed_by',
        'old_status',
        'new_status',
        'severity',
        'reason',
    ];

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }

    /** @return BelongsTo<Incident, $this> */
    public function incident(): BelongsTo
    {
        return $this->belongsTo(Incident::class);
    }

    /** @return BelongsTo<User, $this> */
    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
