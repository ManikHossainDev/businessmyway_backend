declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                name: string;
                role: string;
                status: string;
                registrationStrategy?: string;
                isEmailVerified?: boolean;
                onboardingStep?: string;
                isOnboardingCompleted?: boolean;
                isDeleted?: boolean;
            };
            requestId?: string;
            abortController?: AbortController;
        }
    }
}

export {};
