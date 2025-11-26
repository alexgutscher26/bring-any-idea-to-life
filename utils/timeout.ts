/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Custom error class for timeout scenarios
 */
export class TimeoutError extends Error {
    constructor(message: string = 'Operation timed out') {
        super(message);
        this.name = 'TimeoutError';
    }
}

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * the specified duration, it rejects with a TimeoutError.
 * 
 * @param promise - The promise to wrap with timeout
 * @param timeoutMs - Timeout duration in milliseconds
 * @param errorMessage - Optional custom error message
 * @returns Promise that resolves with the original promise value or rejects with TimeoutError
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage?: string
): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new TimeoutError(errorMessage || `Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutId!);
        return result;
    } catch (error) {
        clearTimeout(timeoutId!);
        throw error;
    }
}

/**
 * Creates an AbortController that automatically aborts after a timeout
 * 
 * @param timeoutMs - Timeout duration in milliseconds
 * @returns Object containing the AbortController and cleanup function
 */
export function createTimeoutController(timeoutMs: number): {
    controller: AbortController;
    cleanup: () => void;
} {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeoutMs);

    return {
        controller,
        cleanup: () => clearTimeout(timeoutId),
    };
}

/**
 * Checks if an error is a TimeoutError
 */
export function isTimeoutError(error: any): error is TimeoutError {
    return error instanceof TimeoutError || error?.name === 'TimeoutError';
}
