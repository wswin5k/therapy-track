import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStaticNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity } from "react-native";
import { Home } from "./screens/Home";
import { EditMedicineScreen } from "./screens/EditMedicineScreen";
import { NotFound } from "./screens/NotFound";
import { SchedulesListScreen } from "./screens/SchedulesListScreen";
import type { ActiveIngredient, BaseUnit, Medicine } from "../models/Medicine";
import EditScheduleScreen from "./screens/EditScheduleScreen";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { SelectMedicineScreen } from "./screens/SelectMedicineScreen";
import { MedicineListScreen } from "./screens/MedicineListScreen";
import { EditSingleDosageScreen } from "./screens/EditSingleDosageScreen";
import { RecordHistoryScreen } from "./screens/RecordHistoryScreen";

export type RootStackParamList = {
  HomeTabs: undefined;
  EditMedicineScreen: { mode: "schedule" | "one-time" } | undefined;
  SelectMedicineScreen: { mode: "schedule" | "one-time" } | undefined;
  EditScheduleScreen: {
    medicine: {
      name: string;
      baseUnit: BaseUnit;
      activeIngredients: ActiveIngredient[];
      dbId?: number;
    };
  };
  EditSingleDosageScreen: {
    medicine: {
      name: string;
      baseUnit: BaseUnit;
      activeIngredients: ActiveIngredient[];
      dbId?: number;
    };
  };
  NotFound: undefined;
};

const HomeTabs = createDrawerNavigator({
  screenOptions: ({ theme, navigation }) => ({
    drawerActiveTintColor: theme.colors.primary,
    drawerInactiveTintColor: theme.colors.textSecondary,
    drawerStyle: {
      backgroundColor: theme.colors.card,
    },
    headerStyle: {
      backgroundColor: theme.colors.card,
    },
    headerTintColor: theme.colors.text,
    headerLeft: () => (
      <TouchableOpacity
        onPress={() => navigation.openDrawer()}
        style={{ marginLeft: 16, marginRight: 10 }}
      >
        <Ionicons name="menu" size={28} color={theme.colors.text} />
      </TouchableOpacity>
    ),
  }),
  screens: {
    Home: {
      screen: Home,
      options: {
        title: "Today",
        drawerIcon: ({ color, size }: { color: string; size: number }) => (
          <Ionicons name="home" size={size} color={color} />
        ),
      },
    },
    MedicinesList: {
      screen: MedicineListScreen,
      options: {
        title: "Medicines",
        drawerIcon: ({ color, size }: { color: string; size: number }) => (
          <Ionicons name="server" size={size} color={color} />
        ),
      },
    },
    SchedulesList: {
      screen: SchedulesListScreen,
      options: {
        title: "Schedules",
        drawerIcon: ({ color, size }: { color: string; size: number }) => (
          <Ionicons name="calendar" size={size} color={color} />
        ),
      },
    },
    RecordHistoryScreen: {
      screen: RecordHistoryScreen,
      options: {
        title: "History",
        drawerIcon: ({ color, size }: { color: string; size: number }) => (
          <Ionicons name="receipt" size={size} color={color} />
        ),
      },
    },
  },
});

const RootStack = createNativeStackNavigator({
  screenOptions: ({ theme }) => ({
    headerStyle: {
      backgroundColor: theme.colors.card,
    },
    headerTintColor: theme.colors.text,
    contentStyle: {
      backgroundColor: theme.colors.background,
    },
  }),
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
        title: "Edit schedule",
      },
    },
    EditSingleDosageScreen: {
      screen: EditSingleDosageScreen,
      options: {
        presentation: "modal",
        title: "Edit single dosage",
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
