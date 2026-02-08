import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStaticNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Home } from "./screens/Home";
import { SelectMedicineScreen } from "./screens/SelectMedicineScreen";
import { NotFound } from "./screens/NotFound";
import { SchedulesListScreen } from "./screens/SchedulesListScreen";
import type { Medicine } from "../models/Medicine";
import EditScheduleScreen from "./screens/EditScheduleScreen";
import { Ionicons } from "@react-native-vector-icons/ionicons";

export type RootStackParamList = {
  HomeTabs: undefined;
  SelectMedicineScreen: { mode: "schedule" | "one-time" } | undefined;
  EditScheduleScreen: { medicine: Medicine };
  NotFound: undefined;
};

const HomeTabs = createDrawerNavigator({
  screens: {
    Home: {
      screen: Home,
      options: {
        title: "Today",
      },
    },
    SchedulesList: {
      screen: SchedulesListScreen,
      options: {
        title: "My Schedules",
      },
    },
  },
  drawerIcon: ({ focused, size }: { focused: boolean; size: number }) => (
    <Ionicons
      name="home"
      size={size}
      color={focused ? "rgba(62, 185, 185, 1)" : "#ba3f3fff"}
    />
  ),
});

const RootStack = createNativeStackNavigator({
  screens: {
    HomeTabs: {
      screen: HomeTabs,
      options: {
        title: "Today",
        headerShown: false,
      },
    },
    SelectMedicineScreen: {
      screen: SelectMedicineScreen,
      options: {
        presentation: "modal",
        title: "Select medicine",
      },
    },
    EditScheduleScreen: {
      screen: EditScheduleScreen,
      options: {
        presentation: "modal",
      },
    },
    NotFound: {
      screen: NotFound,
      options: {
        title: "404",
      },
      linking: {
        path: "*",
      },
    },
  },
});

export const Navigation = createStaticNavigation(RootStack);

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
