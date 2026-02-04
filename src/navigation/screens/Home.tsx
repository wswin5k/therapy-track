import { Button } from "@react-navigation/elements";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Home() {
  return (
    <SafeAreaView style={styles.container}>
      <Button screen="SelectMedicineScreen">Add one-time entry</Button>
      <Button screen="SelectMedicineScreen">Add Schedule</Button>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
});
