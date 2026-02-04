import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../index";
import { FloatingActionButton } from "../../components/FloatingActionButton";

type HomeNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "HomeTabs"
>;

export function Home() {
  const navigation = useNavigation<HomeNavigationProp>();

  const fabActions = [
    {
      label: "Add one-time entry",
      onPress: () =>
        navigation.navigate("SelectMedicineScreen", { mode: "one-time" }),
    },
    {
      label: "Add Schedule",
      onPress: () =>
        navigation.navigate("SelectMedicineScreen", { mode: "schedule" }),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <FloatingActionButton actions={fabActions} position="right" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
