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
 * Wraps a promise with a timeout, rejecting if it doesn't resolve in time.
 *
 * This function creates a race between the provided promise and a timeout promise. If the promise resolves before the timeout, its value is returned. If the timeout occurs first, a TimeoutError is thrown with a custom or default message. The timeout is cleared in both success and error cases to prevent memory leaks.
 *
 * @param promise - The promise to wrap with timeout
 * @param timeoutMs - Timeout duration in milliseconds
 * @param errorMessage - Optional custom error message
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
 * Creates an AbortController that aborts after a specified timeout.
 * @param timeoutMs - Timeout duration in milliseconds.
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
