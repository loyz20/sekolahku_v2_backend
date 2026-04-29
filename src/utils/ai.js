const { GoogleGenerativeAI } = require("@google/generative-ai");

// Inisialisasi library resmi
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Daftar model prioritas berdasarkan hasil cek-model.js Anda
const ACTIVE_MODELS = [
    "gemini-2.5-flash-lite",         // Paling stabil & kuota biasanya lebih besar
    "gemini-2.0-flash-lite",         // Cepat & Pintar
    "gemini-3.1-flash-lite-preview",   // Model terbaru
];

/**
 * Helper untuk memanggil model agar DRY (Don't Repeat Yourself)
 */
async function callGemini(modelName, prompt) {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

/**
 * Generate Tujuan Pembelajaran (TP) based on CP data
 */
async function generateTP(data, attempt = 1) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured in .env');
    }

    const currentModel = ACTIVE_MODELS[attempt - 1] || ACTIVE_MODELS[0];

    const prompt = `
Anda adalah guru profesional Indonesia yang ahli dalam Kurikulum Merdeka.

Prinsip Perumusan TP (Kemdikdasmen):
1. TP harus memuat 2 komponen utama:
   - Kompetensi: Kemampuan atau keterampilan yang perlu ditunjukkan/didemonstrasikan murid (kata kerja operasional).
   - Lingkup Materi: Konten dan konsep utama yang perlu dipahami.
2. TP harus operasional dan konkret.
3. TP adalah tujuan yang lebih umum (goals), bukan tujuan harian (objectives).

Tugas: Rumuskan 5-10 Tujuan Pembelajaran (TP) berdasarkan CP berikut dengan mematuhi prinsip di atas.

Data:
Mapel: ${data.mapel}
Fase: ${data.fase}
CP: ${data.cp}

Instruksi Khusus:
- Setiap TP harus jelas memadukan Kompetensi dan Lingkup Materi.
- Gunakan bahasa yang sederhana namun formal.
- Urutkan dari yang paling dasar secara logis.

Output JSON:
{
  "tp": [
    {
      "kode": "TP 1",
      "deskripsi": "Kalimat TP yang memuat Kompetensi + Lingkup Materi"
    }
  ]
}
`;

    try {
        console.log(`AI Attempt ${attempt} (TP) using ${currentModel}...`);
        const text = await callGemini(currentModel, prompt);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('AI tidak memberikan format JSON yang valid');

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.warn(`Gemini Warning (Attempt ${attempt}): ${error.message}`);

        // Retry jika: Busy (503), Model Not Found (404), atau Quota Exceeded (429)
        const isRetryable = error.message.includes('503') || error.message.includes('404') || error.message.includes('429');

        if (isRetryable && attempt < ACTIVE_MODELS.length) {
            console.log(`Retrying with next model...`);
            await new Promise(resolve => setTimeout(resolve, 1500)); // Jeda 1.5 detik
            return generateTP(data, attempt + 1);
        }
        throw new Error(`AI Error (TP): ${error.message}`);
    }
}

/**
 * Generate Alur Tujuan Pembelajaran (ATP) based on TP List
 */
async function generateATP(data, attempt = 1) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured in .env');
    }

    const currentModel = ACTIVE_MODELS[attempt - 1] || ACTIVE_MODELS[0];

    // Map complex UUIDs to simple temporary IDs for AI stability
    const idMap = new Map();
    const simplifiedTPs = data.tpList.map((tp, index) => {
        const tempId = `TP_${index + 1}`;
        idMap.set(tempId, tp.id);
        return {
            id: tempId,
            kode: tp.kode,
            deskripsi: tp.deskripsi
        };
    });

    const prompt = `
Anda adalah pakar kurikulum pendidikan Indonesia yang ahli dalam Kurikulum Merdeka.

Prinsip Penyusunan ATP (Kemdikdasmen):
1. ATP adalah rangkaian TP yang disusun secara sistematis dan logis.
2. ATP disusun secara linier, satu arah, dan tidak bercabang (non-branching).
3. ATP harus tuntas mencakup satu fase (tidak terpotong).
4. Fokus pada pencapaian CP, bukan strategi pedagogi atau profil pelajar.
5. Metode penyusunan logis: dari kemampuan sederhana ke rumit (scaffolding).

Tugas: Susunlah Alur Tujuan Pembelajaran (ATP) untuk satu fase pembelajaran selama (${data.total_minggu} minggu) berdasarkan daftar TP berikut.

Data:
Mapel: ${data.mapel}
Fase: ${data.fase}
Daftar TP (Gunakan ID TP_x sebagai tp_id):
${JSON.stringify(simplifiedTPs)}

Instruksi:
- WAJIB gunakan SEMUA TP yang diberikan dalam daftar. Jangan ada yang terlewat.
- DILARANG membiarkan ada minggu yang kosong (tanpa TP atau tanpa catatan).
- Jika jumlah TP lebih sedikit dari jumlah minggu, distribusikan satu TP ke dalam beberapa minggu berturut-turut (pendalaman materi).
- Jika semua TP sudah terdistribusi namun masih ada minggu efektif yang tersisa sebelum UAS, isi minggu tersebut dengan "Penguatan Materi & Refleksi" atau "Proyek Kelas".
- Pastikan alur bersifat linier dan menggambarkan urutan kegiatan dari hari ke hari.
- Sisakan Minggu ${Math.floor(data.total_minggu / 2)} untuk "UTS" dan 2 minggu terakhir (Minggu ${data.total_minggu - 1} sampai ${data.total_minggu}) untuk "UAS/Remedial".
- Untuk minggu UTS dan UAS, set "tp_id" menjadi null dan isi "catatan" dengan "UTS" atau "UAS/Remedial".

Output JSON:
{
  "atp": [
    {
      "tp_id": "ID dari data input (contoh: TP_1)",
      "catatan": "Optional label like UTS/UAS",
      "minggu_ke": 1,
      "urutan": 1
    }
  ]
}
`;

    try {
        console.log(`AI Attempt ${attempt} (ATP) using ${currentModel}...`);
        const text = await callGemini(currentModel, prompt);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('AI tidak memberikan format JSON yang valid');

        const result = JSON.parse(jsonMatch[0]);

        // Map temporary IDs back to original UUIDs
        if (result.atp) {
            result.atp = result.atp.map(item => ({
                ...item,
                tp_id: idMap.get(item.tp_id) || null
            }));
        }

        return result;
    } catch (error) {
        console.warn(`Gemini Warning (Attempt ${attempt}): ${error.message}`);
        const isRetryable = error.message.includes('503') || error.message.includes('404') || error.message.includes('429');

        if (isRetryable && attempt < ACTIVE_MODELS.length) {
            console.log(`Retrying with next model...`);
            await new Promise(resolve => setTimeout(resolve, 1500));
            return generateATP(data, attempt + 1);
        }
        throw new Error(`AI Error (ATP): ${error.message}`);
    }
}

/**
 * Generate Modul Ajar based on TP Description
 */
async function generateModulAjar(data, attempt = 1) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured in .env');
    }

    const currentModel = ACTIVE_MODELS[attempt - 1] || ACTIVE_MODELS[0];

    const prompt = `
Anda adalah pakar kurikulum Kemdikdasmen Indonesia.
Tugas: Buatkan Modul Ajar Kurikulum Merdeka yang lengkap dan sistematis berdasarkan panduan resmi terbaru 2025.

Data:
Mapel: ${data.mapel}
Fase: ${data.fase}
Tujuan Pembelajaran (TP): ${data.tp_deskripsi}

Struktur Wajib (Terapkan dalam konten):
1. INFORMASI UMUM:
   - Identitas: Jenjang, Kelas, Alokasi Waktu.
   - Kompetensi Awal: Prasyarat sebelum mulai materi.
   - Profil Pelajar Pancasila: Pilih 2-3 dimensi yang paling relevan (misal: Mandiri, Gotong Royong, Kreatif).
   - Sarana & Prasarana: Media, alat, dan lingkungan belajar.
   - Target Peserta Didik: Reguler/Kesulitan/Pencapaian Tinggi.
   - Model Pembelajaran: PjBL, Discovery, dsb.

2. KOMPONEN INTI:
   - Tujuan Pembelajaran: Harus spesifik dan operasional.
   - Pemahaman Bermakna: Manfaat nyata bagi siswa setelah belajar ini.
   - Pertanyaan Pemantik: Pertanyaan untuk memancing rasa ingin tahu.
   - Kegiatan Pembelajaran: 
     a. Pendahuluan (Apersepsi, Motivasi).
     b. Inti (Langkah detail, diferensiasi proses/konten).
     c. Penutup (Refleksi, Rangkuman, Formatif).
   - Asesmen: Diagnostik, Formatif, dan Sumatif (beserta kriteria penilaian).
   - Refleksi: Untuk guru dan siswa.

3. LAMPIRAN:
   - LKPD (Lembar Kerja Peserta Didik).
   - Bahan Bacaan Guru & Siswa.
   - Glosarium & Daftar Pustaka.

Instruksi Khusus:
- Gunakan bahasa yang profesional namun mudah dipahami guru.
- Pastikan kegiatan inti bersifat interaktif (student-centered).
- PENTING: Semua field di bawah harus berupa STRING (teks panjang yang diformat dengan baik), bukan array/object.

Output JSON:
{
  "judul": "Judul Modul yang Menarik",
  "langkah_pembelajaran": "Tuliskan seluruh isi KOMPONEN INTI (Tujuan, Pemahaman, Pemantik, Langkah detail, Asesmen) di sini dengan format yang rapi.",
  "media": "Tuliskan seluruh isi INFORMASI UMUM (Identitas, P5, Sarana, Target, Model) di sini.",
  "asesmen": "Tuliskan seluruh isi LAMPIRAN (LKPD, Glosarium, Daftar Pustaka) di sini."
}
`;

    try {
        console.log(`AI Attempt ${attempt} (Modul) using ${currentModel}...`);
        const text = await callGemini(currentModel, prompt);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('AI tidak memberikan format JSON yang valid');

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.warn(`Gemini Warning (Attempt ${attempt}): ${error.message}`);
        const isRetryable = error.message.includes('503') || error.message.includes('404') || error.message.includes('429');

        if (isRetryable && attempt < ACTIVE_MODELS.length) {
            console.log(`Retrying with next model...`);
            await new Promise(resolve => setTimeout(resolve, 1500));
            return generateModulAjar(data, attempt + 1);
        }
        throw new Error(`AI Error (Modul): ${error.message}`);
    }
}

module.exports = {
    generateTP,
    generateATP,
    generateModulAjar
};
