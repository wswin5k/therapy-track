import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// the translations
// (tip move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
const resources = {
  en: {
    translation: {
      "Brand name": "Brand name",
      "Active ingredients": "Active ingredients",
      "Active ingredients per base unit": "Active ingredients per base unit",
      Frequency: "Frequency",
      "Once daily": "Once daily",
      "Twice daily": "Twice daily",
      "Three times daily": "Three times daily",
      Weekly: "Weekly",
      "Every two weeks": "Every two weeks",

      tablet_other: "tablets",
      capsule_other: "capsules",
      milliliter_other: "milliliters",
      "5ml dose_other": "5ml doses",
      drop_other: "drops",
      "injection pen_other": "injection pens",
      "press of a dosing pump_other": "presses of a dosing pump",
      vial_other: "vials",
      "pre-filled syringe_other": "pre-filled syringes",
      gram_other: "grams",
      gummy_other: "gummies",
      suppository_other: "suppositories",
      dose_other: "doses",

      pill_one: "pill",
      pill_other: "pills",

      number_ordinal_1: "First",
      number_ordinal_2: "Second",
      number_ordinal_3: "Third",
      number_ordinal_other: "{{count}}th",
    },
  },
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: "en", // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
    // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
    // if you're using a language detector, do not define the lng option

    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
