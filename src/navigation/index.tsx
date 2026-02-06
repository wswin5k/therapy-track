import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStaticNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Home } from "./screens/Home";
import { SelectMedicineScreen } from "./screens/SelectMedicineScreen";
import { NotFound } from "./screens/NotFound";
import { SchedulesListScreen } from "./screens/SchedulesListScreen";
import type { MedicineData } from "../models/MedicineData";
import EditScheduleScreen from "./screens/EditScheduleScreen";

export type RootStackParamList = {
  HomeTabs: undefined;
  SelectMedicineScreen: { mode: "schedule" | "one-time" } | undefined;
  EditScheduleScreen: { medicine: MedicineData };
  NotFound: undefined;
};

const HomeTabs = createDrawerNavigator({
  screens: {
    Home: {
      screen: Home,
      options: {
        title: "Home",
      },
    },
    SchedulesList: {
      screen: SchedulesListScreen,
      options: {
        title: "My Schedules",
      },
    },
  },
});

const RootStack = createNativeStackNavigator({
  screens: {
    HomeTabs: {
      screen: HomeTabs,
      options: {
        title: "Home",
        headerShown: false,
      },
    },
    SelectMedicineScreen: {
      screen: SelectMedicineScreen,
      options: () => ({
        presentation: "modal",
      }),
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
