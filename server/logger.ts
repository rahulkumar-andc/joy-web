import winston from "winston";

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const level = () => {
    const env = process.env.NODE_ENV || "development";
    const isDevelopment = env === "development";
    return isDevelopment ? "debug" : "warn";
};

const colors = {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    debug: "white",
};

winston.addColors(colors);

// Redaction Logic
const SENSITIVE_KEYS = [
    "password", "token", "secret", "authorization", "cookie",
    "creditCard", "cvv", "apiKey", "key_id", "key_secret",
    "access_token", "refresh_token"
];

const redactSensitiveData = winston.format((info) => {
    const redact = (obj: any): any => {
        if (!obj) return obj;
        if (typeof obj !== "object") return obj;

        // Handle Arrays
        if (Array.isArray(obj)) {
            return obj.map(redact);
        }

        // Handle Objects
        const newObj: any = { ...obj };
        for (const key of Object.keys(newObj)) {
            if (SENSITIVE_KEYS.some(s => key.toLowerCase().includes(s))) {
                newObj[key] = "***REDACTED***";
            } else if (typeof newObj[key] === "object") {
                newObj[key] = redact(newObj[key]);
            }
        }
        return newObj;
    };

    return redact(info);
});

const format = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
    redactSensitiveData(), // Apply redaction before colorize/printf
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message} ${info.metadata ? JSON.stringify(info.metadata) : ""
            }`
    )
);

const transports = [
    new winston.transports.Console(),
    new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
        format: winston.format.combine(
            winston.format.uncolorize(),
            winston.format.json()
        ),
    }),
    new winston.transports.File({
        filename: "logs/all.log",
        format: winston.format.combine(
            winston.format.uncolorize(),
            winston.format.json()
        ),
    }),
];

export const logger = winston.createLogger({
    level: level(),
    levels,
    format,
    transports,
});
