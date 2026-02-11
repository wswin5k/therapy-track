import "@react-navigation/native";

declare module "*.png" {
  const value: import("react-native").ImageSourcePropType;
  export default value;
}

declare module "*.jpg" {
  const value: import("react-native").ImageSourcePropType;
  export default value;
}

declare module "@react-navigation/native" {
  export interface Theme {
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
  }
}
