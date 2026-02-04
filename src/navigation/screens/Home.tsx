import { Button, Text } from "@react-navigation/elements";
import { StyleSheet, View } from "react-native";

export function Home() {
  return (
    <View style={styles.container}>
      <Text>Home Screen</Text>
      <Button screen="Profile" params={{ user: "jane" }}>
        Go to Profile
      </Button>
      <Button screen="Profile" params={{ user: "jane" }}>
        Add one-time entry
      </Button>
      <Button screen="MedicineSelect">Add Schedule</Button>
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
