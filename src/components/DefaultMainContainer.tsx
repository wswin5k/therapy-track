import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function DefaultMainContainer({
  justifyContent = "flex-start",
  children,
}: Readonly<{
  justifyContent: "center" | "flex-start";
  children: React.ReactNode;
}>) {
  return (
    <SafeAreaView style={[styles.safeArea]} edges={["bottom"]}>
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
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flex: 1,
    justifyContent: "flex-start",
    padding: 10,
  },
});
