declare module "*.png" {
  const value: import("react-native").ImageSourcePropType;
  export default value;
}

declare module "*.jpg" {
  const value: import("react-native").ImageSourcePropType;
  export default value;
}

declare global {
  namespace ReactNavigation {
    interface Theme {
      dark: boolean;
      colors: {
        primary: string;
        background: string;
        card: string;
        text: string;
        border: string;
        notification: string;
        surface: string;
        textSecondary: string;
        textTertiary: string;
        success: string;
        error: string;
      };
      fonts: {
        regular: {
          fontFamily: string;
          fontWeight:
            | "normal"
            | "bold"
            | "100"
            | "200"
            | "300"
            | "400"
            | "500"
            | "600"
            | "700"
            | "800"
            | "900";
        };
        medium: {
          fontFamily: string;
          fontWeight:
            | "normal"
            | "bold"
            | "100"
            | "200"
            | "300"
            | "400"
            | "500"
            | "600"
            | "700"
            | "800"
            | "900";
        };
        bold: {
          fontFamily: string;
          fontWeight:
            | "normal"
            | "bold"
            | "100"
            | "200"
            | "300"
            | "400"
            | "500"
            | "600"
            | "700"
            | "800"
            | "900";
        };
        heavy: {
          fontFamily: string;
          fontWeight:
            | "normal"
            | "bold"
            | "100"
            | "200"
            | "300"
            | "400"
            | "500"
            | "600"
            | "700"
            | "800"
            | "900";
        };
      };
    }
  }
}

export {};
