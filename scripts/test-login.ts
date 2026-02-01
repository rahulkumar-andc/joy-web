import "dotenv/config";
import http from "http";

// Config
const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(path: string, method: string, sendCookies: string[] = [], body: any = null, headers: any = {}) {
    return new Promise<{ statusCode: number, headers: http.IncomingHttpHeaders, body: string }>((resolve, reject) => {
        const url = new URL(path, BASE_URL);

        const options: http.RequestOptions = {
            method,
            headers: {
                ...headers,
                "Cookie": sendCookies.join("; ")
            }
        };

        if (body) {
            const data = JSON.stringify(body);
            (options.headers as any)["Content-Type"] = "application/json";
            (options.headers as any)["Content-Length"] = Buffer.byteLength(data);
        }

        const req = http.request(url, options, (res) => {
            let data = "";
            res.on("data", (chunk) => data += chunk);
            res.on("end", () => resolve({
                statusCode: res.statusCode || 0,
                headers: res.headers,
                body: data
            }));
        });

        req.on("error", reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

function extractCookie(headers: http.IncomingHttpHeaders, name: string): string | null {
    const cookies = headers["set-cookie"];
    if (!cookies) return null;

    for (const cookie of cookies) {
        if (cookie.startsWith(name + "=")) {
            return cookie.split(";")[0];
        }
    }
    return null;
}

function getCookieValue(cookieString: string): string {
    return cookieString.split("=")[1];
}

async function testLogin() {
    console.log(`Testing Login Flow on ${BASE_URL}...`);

    try {
        // Step 1: Get CSRF Token and Session
        console.log("1. Fetching initial session (GET /api/auth/me)...");
        const initRes = await makeRequest("/api/auth/me", "GET");

        const csrfCookie = extractCookie(initRes.headers, "CSRF-TOKEN");
        const sessionCookie = extractCookie(initRes.headers, "connect.sid");

        if (!csrfCookie || !sessionCookie) {
            console.error("❌ Failed to get cookies.");
            console.log("Status:", initRes.statusCode);
            console.log("Headers:", initRes.headers);
            console.log("Body:", initRes.body);
            process.exit(1);
        }

        const csrfToken = getCookieValue(csrfCookie);
        console.log("✅ Got CSRF Token:", csrfToken);
        console.log("✅ Got Session ID");

        // Step 2: Login
        console.log("\n2. Attempting Login (POST /api/auth/login)...");
        const loginRes = await makeRequest("/api/auth/login", "POST", [csrfCookie, sessionCookie], {
            username: "admin@example.com",
            password: "admin123"
        }, {
            "X-CSRF-Token": csrfToken
        });

        console.log(`Response Status: ${loginRes.statusCode}`);
        if (loginRes.statusCode === 200) {
            console.log("✅ LOGIN SUCCESS!");
            console.log("User Data:", loginRes.body);
        } else {
            console.error("❌ LOGIN FAILED");
            console.log("Body:", loginRes.body);
            process.exit(1);
        }

    } catch (error) {
        console.error("Request failed:", error);
        process.exit(1);
    }
}

testLogin();
