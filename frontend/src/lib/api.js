import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({
    baseURL: API_BASE,
    timeout: 120_000,
});

export async function parseCobol(copybook) {
    const { data } = await api.post("/parse-cobol", { copybook });
    return data;
}

export async function mapSchema(fields, target, tableName) {
    const { data } = await api.post("/map-schema", {
        fields,
        target,
        table_name: tableName || null,
    });
    return data;
}

export async function runPipeline(config) {
    const { data } = await api.post("/pipeline/run", config);
    return data;
}

export async function validateData(payload) {
    const { data } = await api.post("/validate-data", payload);
    return data;
}

export async function listRuns(limit = 10) {
    const { data } = await api.get(`/runs?limit=${limit}`);
    return data;
}
