import { GoogleGenAI } from "@google/genai";

// Initialize AI only if API key is available
const apiKey = process.env.API_KEY as string;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateJobDescription = async (
    jabatan: string,
    departemen: string,
    spesialisasi?: string,
    kompetensi?: string[],
    sertifikasi?: string[]
): Promise<string> => {
    try {
        // Check if AI is available
        if (!ai) {
            console.warn("Gemini API key not configured. Using default job description.");
            return `Deskripsi pekerjaan untuk posisi ${jabatan} di departemen ${departemen} akan dibuat secara manual.`;
        }

        let prompt = `Buatkan deskripsi pekerjaan detail dan profesional dalam format bullet point untuk posisi "${jabatan}" ${spesialisasi ? `dengan spesialisasi "${spesialisasi}" ` : ''}di departemen "${departemen}" sebuah rumah sakit modern. Sertakan:
- Tanggung Jawab Utama (3-4 poin)
- Kualifikasi (2-3 poin)
- Keterampilan yang Dibutuhkan (2-3 poin)`;

        if (sertifikasi && sertifikasi.length > 0) {
            prompt += `\n- Sertifikasi Wajib: ${sertifikasi.join(', ')}`;
        }
        if (kompetensi && kompetensi.length > 0) {
            prompt += `\n- Kompetensi Kunci: ${kompetensi.join(', ')}`;
        }

        prompt += "\n\nGunakan Bahasa Indonesia yang formal.";

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Error generating job description:", error);
        return "Gagal membuat deskripsi pekerjaan. Silakan coba lagi.";
    }
};