import { apiRequest } from "./queryClient";

const api = {
    get: (url: string) => apiRequest("GET", url).then(res => res.json().then(data => ({ data }))),
    post: (url: string, body?: any) => apiRequest("POST", url, body).then(res => res.json().then(data => ({ data }))),
    put: (url: string, body?: any) => apiRequest("PUT", url, body).then(res => res.json().then(data => ({ data }))),
    patch: (url: string, body?: any) => apiRequest("PATCH", url, body).then(res => res.json().then(data => ({ data }))),
    delete: (url: string) => apiRequest("DELETE", url),
};

export default api;
