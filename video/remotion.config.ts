import { Config } from "@remotion/cli/config";

// Point d'entrée de la vidéo et qualité d'export (MP4 H.264, lisible partout,
// y compris WhatsApp, TikTok et Reels).
Config.setEntryPoint("./src/index.ts");
Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setCrf(18);
