import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../logger';
import { z } from 'zod';

const handleZodError = (err: z.ZodError) => {
    const message = err.errors.map(e => e.message).join('. ');
    return new AppError(message, 400);
};

const sendErrorDev = (err: any, res: Response) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

const sendErrorProd = (err: any, res: Response) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    }
    // Programming or other unknown error: don't leak details
    else {
        // 1) Log error
        logger.error('ERROR 💥', err);

        // 2) Send generic message
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!'
        });
    }
};

export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else {
        let error = { ...err };
        error.message = err.message;

        if (err instanceof z.ZodError) error = handleZodError(err);
        if (err.name === 'CastError') error = new AppError(`Invalid ${err.path}: ${err.value}.`, 400);
        // Add more error conversions here (e.g. JWT errors, DB errors)

        sendErrorProd(error, res);
    }
};
