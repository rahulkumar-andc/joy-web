import { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";

declare module "express-session" {
    interface SessionData {
        csrfToken: string;
    }
}

export const csrfMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // 1. Ensure a token exists in the session
    if (!req.session.csrfToken) {
        req.session.csrfToken = randomBytes(32).toString("hex");
    }

    // 2. Set the token in a cookie readable by the client (non-httpOnly)
    // We update this cookie on every request to ensure it's fresh/alive
    // Using a different name for the cookie to distinguish from session
    res.cookie("CSRF-TOKEN", req.session.csrfToken, {
        httpOnly: false, // Allow JS to read it
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/"
    });

    // 3. Skip check for safe methods (GET, HEAD, OPTIONS)
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        return next();
    }

    // 4. Verify token for mutating methods
    const token = req.headers["x-csrf-token"] || req.headers["x-xsrf-token"];

    // Check coverage: if no token provided or mismatch
    if (!token || token !== req.session.csrfToken) {
        console.log(`CSRF Error: Method=${req.method} Path=${req.path}`);
        console.log(`Expected (Session): ${req.session.csrfToken}`);
        console.log(`Received (Header): ${token}`);
        return res.status(403).json({ message: "Invalid CSRF token" });
    }

    next();
};
