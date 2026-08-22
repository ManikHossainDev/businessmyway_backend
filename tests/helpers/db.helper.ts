export const connectTestDatabase = async (): Promise<void> => {
    // Integration tests in this template mock services and do not require a live DB.
};

export const clearTestDatabase = async (): Promise<void> => {
    // No-op for mocked integration tests.
};

export const disconnectTestDatabase = async (): Promise<void> => {
    // No-op for mocked integration tests.
};
