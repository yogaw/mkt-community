import { db } from "../src/database";

/**
 * A starter set of IDX listings so the ticker picker works out of the box.
 *
 * This is NOT the full ~900-name universe. Load the official IDX "Daftar Saham"
 * export over the top of it with:
 *
 *   npm run import:stocks <path-to-csv>
 *
 * which upserts by ticker, so re-importing is safe and these rows are simply
 * corrected or extended by the authoritative list.
 */
const starterStocks: Array<[string, string]> = [
  ["AADI", "Adaro Andalan Indonesia Tbk"],
  ["ACES", "Aspirasi Hidup Indonesia Tbk"],
  ["ADMR", "Adaro Minerals Indonesia Tbk"],
  ["ADRO", "Alamtri Resources Indonesia Tbk"],
  ["AKRA", "AKR Corporindo Tbk"],
  ["AMMN", "Amman Mineral Internasional Tbk"],
  ["AMRT", "Sumber Alfaria Trijaya Tbk"],
  ["ANTM", "Aneka Tambang Tbk"],
  ["ARTO", "Bank Jago Tbk"],
  ["ASII", "Astra International Tbk"],
  ["BBCA", "Bank Central Asia Tbk"],
  ["BBNI", "Bank Negara Indonesia (Persero) Tbk"],
  ["BBRI", "Bank Rakyat Indonesia (Persero) Tbk"],
  ["BBTN", "Bank Tabungan Negara (Persero) Tbk"],
  ["BMRI", "Bank Mandiri (Persero) Tbk"],
  ["BRIS", "Bank Syariah Indonesia Tbk"],
  ["BRPT", "Barito Pacific Tbk"],
  ["BUKA", "Bukalapak.com Tbk"],
  ["BULL", "Buana Lintas Lautan Tbk"],
  ["CPIN", "Charoen Pokphand Indonesia Tbk"],
  ["CTRA", "Ciputra Development Tbk"],
  ["CUAN", "Petrindo Jaya Kreasi Tbk"],
  ["ELSA", "Elnusa Tbk"],
  ["EMTK", "Elang Mahkota Teknologi Tbk"],
  ["ERAA", "Erajaya Swasembada Tbk"],
  ["ESSA", "ESSA Industries Indonesia Tbk"],
  ["EXCL", "XL Axiata Tbk"],
  ["GGRM", "Gudang Garam Tbk"],
  ["GOTO", "GoTo Gojek Tokopedia Tbk"],
  ["HRUM", "Harum Energy Tbk"],
  ["ICBP", "Indofood CBP Sukses Makmur Tbk"],
  ["INCO", "Vale Indonesia Tbk"],
  ["INDF", "Indofood Sukses Makmur Tbk"],
  ["INDY", "Indika Energy Tbk"],
  ["INET", "Sinergi Inti Andalan Prima Tbk"],
  ["INKP", "Indah Kiat Pulp & Paper Tbk"],
  ["INTP", "Indocement Tunggal Prakarsa Tbk"],
  ["ISAT", "Indosat Tbk"],
  ["ITMG", "Indo Tambangraya Megah Tbk"],
  ["JPFA", "Japfa Comfeed Indonesia Tbk"],
  ["JSMR", "Jasa Marga (Persero) Tbk"],
  ["KLBF", "Kalbe Farma Tbk"],
  ["MAPI", "Mitra Adiperkasa Tbk"],
  ["MDKA", "Merdeka Copper Gold Tbk"],
  ["MEDC", "Medco Energi Internasional Tbk"],
  ["MIKA", "Mitra Keluarga Karyasehat Tbk"],
  ["MNCN", "Media Nusantara Citra Tbk"],
  ["MYOR", "Mayora Indah Tbk"],
  ["PGAS", "Perusahaan Gas Negara Tbk"],
  ["PGEO", "Pertamina Geothermal Energy Tbk"],
  ["PTBA", "Bukit Asam Tbk"],
  ["PTRO", "Petrosea Tbk"],
  ["RAJA", "Rukun Raharja Tbk"],
  ["SIDO", "Industri Jamu dan Farmasi Sido Muncul Tbk"],
  ["SMGR", "Semen Indonesia (Persero) Tbk"],
  ["SMRA", "Summarecon Agung Tbk"],
  ["TINS", "Timah Tbk"],
  ["TLKM", "Telkom Indonesia (Persero) Tbk"],
  ["TOWR", "Sarana Menara Nusantara Tbk"],
  ["TPIA", "Chandra Asri Pacific Tbk"],
  ["UNTR", "United Tractors Tbk"],
  ["UNVR", "Unilever Indonesia Tbk"],
];

export async function seedStocks(): Promise<void> {
  for (const [ticker, name] of starterStocks) {
    await db.stock.upsert({
      where: { ticker },
      update: { name, isActive: true },
      create: { ticker, name },
    });
  }
  console.log(`Seeded ${starterStocks.length} stocks (starter set — import the IDX list for all ~900)`);
}
