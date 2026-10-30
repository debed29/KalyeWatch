<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;
use Symfony\Component\HttpFoundation\Response;

class RegisterResponse implements RegisterResponseContract
{
    /**
     * Redirect newly registered users to the dashboard.
     *
     * Users who have not verified their email will be
     * redirected by the existing verified middleware.
     */
    public function toResponse($request): Response
    {
        return $request->wantsJson()
            ? new JsonResponse('', 201)
            : redirect()->intended('/dashboard');
    }
}
