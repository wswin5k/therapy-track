import { Button, Text } from "@react-navigation/elements";
import { StyleSheet, View } from "react-native";
import {
  SafeAreaView,
} from 'react-native-safe-area-context';

export function Home() {
  return (
    <SafeAreaView style={styles.container}>
      <Button screen="SelectMedicineScreen" params={{ nextScreen: "" }}>
        Add one-time entry
      </Button>
      <Button
        screen="SelectMedicineScreen"
        params={{ nextScreen: "AddScheduleScreen" }}
      >
        Add Schedule
      </Button>
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
