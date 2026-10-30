<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidentImage extends Model
{
    // Fields that can be assigned when creating an incident image.
    protected $fillable = [
        'incident_id',
        'path',
        'mime_type',
        'size_bytes',
    ];

    /**
     * Each image belongs to one incident report.
     *
     * @return BelongsTo<Incident, $this>
     */
    public function incident(): BelongsTo
    {
        return $this->belongsTo(Incident::class);
    }
}
