import "dotenv/config";
import http from "http";

// Config
const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

let cookies: string[] = [];
let csrfToken: string = "";

function extractCookie(headers: http.IncomingHttpHeaders, name: string): string | null {
    const setCookies = headers["set-cookie"];
    if (!setCookies) return null;
    for (const cookie of setCookies) {
        if (cookie.startsWith(name + "=")) {
            return cookie.split(";")[0];
        }
    }
    return null;
}

function getCookieValue(cookieString: string): string {
    return cookieString.split("=")[1];
}

function makeRequest(path: string, method: string, body: any = null) {
    return new Promise<{ statusCode: number, headers: http.IncomingHttpHeaders, body: any }>((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options: http.RequestOptions = {
            method,
            headers: {
                "Cookie": cookies.join("; "),
                "X-CSRF-Token": csrfToken,
                "Content-Type": "application/json"
            }
        };

        const req = http.request(url, options, (res) => {
            let data = "";
            res.on("data", (chunk) => data += chunk);
            res.on("end", () => {
                // Update cookies if new ones are set
                const newCsrf = extractCookie(res.headers, "CSRF-TOKEN");
                const newSess = extractCookie(res.headers, "connect.sid");

                if (newCsrf) {
                    cookies = cookies.filter(c => !c.startsWith("CSRF-TOKEN="));
                    cookies.push(newCsrf);
                    csrfToken = getCookieValue(newCsrf);
                }
                if (newSess) {
                    cookies = cookies.filter(c => !c.startsWith("connect.sid="));
                    cookies.push(newSess);
                }

                let parsedBody = data;
                try { parsedBody = JSON.parse(data); } catch { }

                resolve({
                    statusCode: res.statusCode || 0,
                    headers: res.headers,
                    body: parsedBody
                });
            });
        });

        req.on("error", reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTest() {
    console.log(`Starting Order Lifecycle Test on ${BASE_URL}...`);

    try {
        // 1. Initial Session
        console.log("\n1. Init Session...");
        await makeRequest("/api/auth/me", "GET");
        console.log("   CSRF Token:", csrfToken);

        // 2. Login
        console.log("\n2. Login...");
        const loginRes = await makeRequest("/api/auth/login", "POST", {
            username: "admin@example.com",
            password: "admin123"
        });
        if (loginRes.statusCode !== 200) throw new Error("Login failed: " + JSON.stringify(loginRes.body));
        console.log("   ✅ Logged in as:", loginRes.body.email);

        // 3. Get Products (to find ID)
        console.log("\n3. Get Products...");
        const productsRes = await makeRequest("/api/products", "GET");
        const product = productsRes.body.products?.[0]; // Access .products array
        if (!product) throw new Error("No products found: " + JSON.stringify(productsRes.body));
        console.log(`   ✅ Found Product: ${product.name} (ID: ${product.id})`);

        // 4. Add to Cart
        console.log("\n4. Add to Cart...");
        const cartRes = await makeRequest("/api/cart", "POST", {
            productId: product.id,
            quantity: 1
        });
        if (cartRes.statusCode !== 200) throw new Error("Add to cart failed: " + JSON.stringify(cartRes.body));
        console.log("   ✅ Added to cart");

        // 5. Place Order
        console.log("\n5. Place Order...");
        const orderRes = await makeRequest("/api/orders", "POST", {
            shippingAddress: {
                fullName: "Test User",
                addressLine1: "123 Test St",
                city: "Test City",
                state: "Test State",
                zipCode: "123456",
                country: "India"
            },
            couponCode: ""
        });
        if (orderRes.statusCode !== 201 && orderRes.statusCode !== 200) throw new Error("Order placement failed: " + JSON.stringify(orderRes.body));
        const orderId = orderRes.body.orderId || orderRes.body.id; // Adjust based on actual response structure
        console.log(`   ✅ Order Placed! ID: ${orderId}`);

        console.log(`\n6. Cancel Order #${orderId}...`);
        const cancelRes = await makeRequest(`/api/orders/${orderId}/status`, "PATCH", {
            status: "cancelled"
        });

        if (cancelRes.statusCode !== 200) {
            console.log("   ❌ Cancel failed: " + JSON.stringify(cancelRes.body));
        } else {
            console.log("   ✅ Order Cancelled!");
        }

    } catch (e) {
        console.error("❌ Test Failed:", e);
        process.exit(1);
    }
}

runTest();
