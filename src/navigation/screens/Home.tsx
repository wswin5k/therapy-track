import { Button, Text } from "@react-navigation/elements";
import { StyleSheet, View } from "react-native";

export function Home() {
  return (
    <View style={styles.container}>
      <Button screen="SelectMedicineScreen" params={{ nextScreen: "" }}>
        Add one-time entry
      </Button>
      <Button screen="SelectMedicineScreen" params={{ nextScreen: "AddScheduleScreen" }}>Add Schedule</Button>
    </View>
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

