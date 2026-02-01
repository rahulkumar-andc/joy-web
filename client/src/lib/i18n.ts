import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    en: {
        translation: {
            "nav": {
                "home": "Home",
                "shop": "Shop",
                "categories": "Categories",
                "login": "Login",
                "cart": "Cart",
                "admin": "Admin",
                "seller": "Seller Dashboard"
            },
            "common": {
                "loading": "Loading...",
                "error": "Something went wrong",
                "save": "Save",
                "cancel": "Cancel"
            }
        }
    },
    hi: {
        translation: {
            "nav": {
                "home": "होम",
                "shop": "दुकान",
                "categories": "श्रेणियाँ",
                "login": "लॉग इन",
                "cart": "कार्ट",
                "admin": "व्यवस्थापक",
                "seller": "विक्रेता डैशबोर्ड"
            },
            "common": {
                "loading": "लोड हो रहा है...",
                "error": "कुछ गलत हो गया",
                "save": "सहेजें",
                "cancel": "रद्द करें"
            }
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;
