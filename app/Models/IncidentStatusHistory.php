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
    public function actor(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
    return $this->belongsTo(User::class, 'changed_by');
    }
    public function incident(): BelongsTo
    {
        return $this->belongsTo(Incident::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
