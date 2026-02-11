import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";

export function DefaultMainContainer({
  justifyContent = "flex-start",
  children,
}: Readonly<{
  justifyContent?: "center" | "flex-start";
  children: React.ReactNode;
}>) {
  const theme = useTheme();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={["bottom"]}
    >
      <View
        style={[styles.scrollContainer, { justifyContent: justifyContent }]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    justifyContent: "flex-start",
    padding: 10,
  },
});
