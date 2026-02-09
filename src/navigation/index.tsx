import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStaticNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Home } from "./screens/Home";
import { EditMedicineScreen } from "./screens/EditMedicineScreen";
import { NotFound } from "./screens/NotFound";
import { SchedulesListScreen } from "./screens/SchedulesListScreen";
import type { ActiveIngredient, BaseUnit, Medicine } from "../models/Medicine";
import EditScheduleScreen from "./screens/EditScheduleScreen";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { SelectMedicineScreen } from "./screens/SelectMedicineScreen";
import { MedicineListScreen } from "./screens/MedicineListScreen";

export type RootStackParamList = {
  HomeTabs: undefined;
  EditMedicineScreen: { mode: "schedule" | "one-time" } | undefined;
  SelectMedicineScreen: { mode: "schedule" | "one-time" } | undefined;
  EditScheduleScreen: {
    medicine: {
      name: string;
      baseUnit: BaseUnit;
      activeIngredients: ActiveIngredient[];
      medicineId?: number;
    };
  };
  NotFound: undefined;
};

const HomeTabs = createDrawerNavigator({
  screens: {
    Home: {
      screen: Home,
      options: {
        title: "Today",
      },
      drawerIcon: ({ focused, size }: { focused: boolean; size: number }) => (
        <Ionicons
          name="calendar"
          size={size}
          color={focused ? "rgba(62, 185, 185, 1)" : "#3fba6eff"}
        />
      ),
    },
    MedicinesList: {
      screen: MedicineListScreen,
      options: {
        title: "Medicines",
        drawerIcon: ({ focused, size }: { focused: boolean; size: number }) => (
          <Ionicons
            name="server"
            size={size}
            color={focused ? "rgba(62, 185, 185, 1)" : "#3fba6eff"}
          />
        ),
      },
    },
    SchedulesList: {
      screen: SchedulesListScreen,
      options: {
        title: "Schedules",
        drawerIcon: ({ focused, size }: { focused: boolean; size: number }) => (
          <Ionicons
            name="calendar"
            size={size}
            color={focused ? "rgba(62, 185, 185, 1)" : "#3fba6eff"}
          />
        ),
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
    EditMedicineScreen: {
      screen: EditMedicineScreen,
      options: {
        presentation: "modal",
        title: "Edit medicine",
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
