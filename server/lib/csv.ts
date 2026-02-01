import { parse } from "csv-parse";

export async function parseCsv(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
        parse(
            buffer,
            {
                columns: true, // Use first row as headers
                skip_empty_lines: true,
                trim: true,
                cast: true, // Auto-convert numbers/booleans
            },
            (err, records) => {
                if (err) {
                    return reject(err);
                }
                resolve(records);
            }
        );
    });
}
