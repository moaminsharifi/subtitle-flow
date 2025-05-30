# Subtitle Sync
![Subtitle Sync Logo](icon-512x512.png)
# 🚀 Subtitle Sync: Rockstar Browser-Based Subtitle Editor 🚀

Welcome to **Subtitle Sync**, a powerful and intuitive subtitle editor that runs entirely in your web browser! That's right – **NO BACKEND REQUIRED!** Experience blazing-fast performance and complete privacy as all your work stays local to your device.

## Table of Contents

*   [✨ Features](#-features-)
*   [Getting Started](#getting-started)
*   [API Keys for Transcription](#api-keys-for-transcription)
    *   [Supported Transcription Languages](#supported-transcription-languages)
*   [🎨 Dark/Light Theme](#-darklight-theme)
*   [🛠️ Development Setup](#️-development-setup-)


## ✨ Features ✨

Subtitle Sync is packed with features to make your subtitle editing workflow smooth and efficient:

*   **🚀 100% Browser-Based:** Edit subtitles offline and keep your media entirely private. No data leaves your browser without your explicit action.
*   **⬆️ Media Upload:** Easily upload video (.mp4, .webm, etc.) and audio (.mp3, .wav, etc.) files directly from your device.
*   **📄 Subtitle Import:** Load existing subtitle files in popular formats like .SRT and .VTT.
*   **✍️ Intuitive Editor:** A clean and responsive interface for adding, deleting, modifying, and adjusting subtitle timings with precision.
*   **▶️ Integrated Media Player:** Synchronize subtitle timings accurately by watching your media directly within the editor.
*   **🧠 AI Transcription (Optional):** Generate subtitles automatically from your media's audio using powerful AI models (requires API keys). Regenerate specific segments as needed.
*   **⬇️ Subtitle Export:** Save your finished subtitles in .SRT or .VTT format.

### Images showcasing the editor:

![First Page](docs/image/screencapture-first-page.png)
![Edit Panel](docs/image/screencapture-edit-panel.png)
![Generate Subtitle with AI](docs/image/screencapture-generate-subtitle-with-ai.png)

## 🚀 Getting Started 🚀

Getting started is a breeze!

Simply open the application in your favorite web browser, and you're ready to start editing. No installation, no server setup, no accounts required!

## 🔑 API Keys for Transcription 🔑

Subtitle Sync offers an optional AI transcription feature to automatically generate subtitles from your media's audio. To use this, you'll need API keys from a supported AI provider. Currently, the application supports **OpenAI** for transcription (utilizing models like Whisper).

### Obtaining Your API Keys

*   **OpenAI API:** Visit the [OpenAI website](https://openai.com/) to sign up and obtain your API key.
*   **Grok API:** Information on obtaining Grok API keys can be found on their respective platform documentation.

*(Note: While Grok is listed, the primary AI transcription functionality currently relies on OpenAI's Whisper model. Ensure you have an OpenAI API key to use the transcription features.)*
This editor supports a wide range of languages for AI transcription. You can select the desired language in the application's settings or when initiating a full transcription.

Here are the currently supported languages:

- English
- Chinese
- German
- Spanish
- Russian
- Korean
- French
- Japanese
- Portuguese
- Turkish
- Polish
- Catalan
- Dutch
- Arabic
- Swedish
- Italian
- Indonesian
- Hindi
- Finnish
- Vietnamese
- Hebrew
- Ukrainian
- Greek
- Malay
- Czech
- Romanian
- Danish
- Hungarian
- Tamil
- Traditional Chinese
- Tagalog
- Bengali
- Bulgarian
- Lao
- Croatian
- Classical Persian
- Afrikaans
- Bosnian
- Macedonian
- Marathi
- Nepali
- Norwegian
- Sinhalese
- Albanian
- Serbian
- Kannada
- Malayalam
- Welsh
- Belarusian
- Slovenian
- Estonian
- Lithuanian
- Latvian
- Galician
- Somali
- Afrikaans
- Azerbaijani
- Burmese
- Gujarati
- Icelandic
- Khmer
- Lao
- Mongolian
- Serbian
- Swahili
- Tajik
- Turkmen
- Urdu
- Uzbek
- Yiddish

### Configuring API Keys
- Select the language that best matches your media's audio for optimal transcription accuracy, or choose "Auto-detect".

Once you have your API keys, you can easily configure them within the application's settings. Look for the settings dialog (usually accessible via a gear or settings icon in the interface), where you'll find dedicated fields to input your OpenAI and Grok API keys.

**Important:** These API keys are stored securely within your browser's local storage. They are **never** sent to any external server other than the respective OpenAI/Grok APIs for transcription purposes. This ensures your privacy and security.

### Modals
![Settings Modal](docs/image/screencapture-setting-modal.png)
![Tips Modal](docs/image/screencapture-tips-modal.png)
![Debug Modal](docs/image/screencapture-debug-modal.png)