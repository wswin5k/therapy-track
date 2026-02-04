import { createDrawerNavigator } from "@react-navigation/drawer";
import { HeaderButton, Text } from "@react-navigation/elements";
import {
  createStaticNavigation,
  StaticParamList,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Home } from "./screens/Home";
import { SelectMedicineScreen } from "./screens/SelectMedicineScreen";
import { AddScheduleScreen } from "./screens/AddScheduleScreen";
import { NotFound } from "./screens/NotFound";
import type { MedicineData } from "../models/MedicineData";

export type RootStackParamList = {
  HomeTabs: undefined;
  SelectMedicineScreen: { mode: "schedule" | "one-time" } | undefined;
  AddScheduleScreen: { medicineData: MedicineData } | undefined;
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
      options: ({ navigation }) => ({
        presentation: "modal",
        headerRight: () => (
          <HeaderButton onPress={navigation.goBack}>
            <Text>Close</Text>
          </HeaderButton>
        ),
      }),
    },
    AddScheduleScreen: {
      screen: AddScheduleScreen,
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
