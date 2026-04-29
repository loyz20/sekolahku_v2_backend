require('dotenv').config();

async function cekModelAktif() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return console.log("API Key tidak ditemukan di .env!");

    console.log("Mencari model yang tersedia...");
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        
        if (data.error) {
            console.error("Error dari Google:", data.error.message);
            return;
        }

        // Filter hanya model yang mendukung pembuatan teks (generateContent)
        const textModels = data.models
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .map(m => m.name.replace('models/', '')); 

        console.log("\n=== MODEL YANG BISA ANDA GUNAKAN ===");
        console.log(textModels);
        console.log("====================================\n");
    } catch (error) {
        console.error("Gagal mengambil data model:", error);
    }
}

cekModelAktif();
