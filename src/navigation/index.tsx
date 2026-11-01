import { createDrawerNavigator } from "@react-navigation/drawer";
import {
  createStaticNavigation,
  NavigatorScreenParams,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { TouchableOpacity } from "react-native";
import { EditMedicineScreen } from "./screens/EditMedicineScreen";
import { NotFound } from "./screens/NotFound";
import { MedicineSchedulesListScreen } from "./screens/MedicineSchedulesListScreen";
import type {
  ActiveIngredient,
  BaseUnit,
  Medicine,
} from "../models/MedicineSchedule";
import EditMedicineScheduleScreen from "./screens/ScheduleScreens/EditMedicineScheduleScreen";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { SelectMedicineScreen } from "./screens/SelectMedicineScreen";
import { MedicineListScreen } from "./screens/MedicineListScreen";
import { EditSingleDosageScreen } from "./screens/EditSingleDosageScreen";
import { HistoryTableScreen } from "./screens/HistoryTable/HistoryTableScreen";
import PartiallyEditAnyScheduleScreen from "./screens/ScheduleScreens/PartiallyEditAnyScheduleScreen";
import { EditGroupScreen } from "./screens/EditGroupScreen";
import { GroupListScreen } from "./screens/GroupListScreen";
import {
  Assessment,
  ValueType,
  ValueDomain,
} from "../models/AssessmentSchedule";
import { EditAssessmentScreen } from "./screens/EditAssessmentScreen";
import { EditSingleMeasurementScreen } from "./screens/EditSingleMeasurementScreen";
import { EditAssessmentScheduleScreen } from "./screens/ScheduleScreens/EditAssessmentScheduleScreen";
import { HomeSwipeable } from "./screens/HomeSwipeable";
import { SelectAssessmentScreen } from "./screens/SelectAssessmentScreen";
import { AssessmentListScreen } from "./screens/AssessmentListScreen";
import { AssessmentSchedulesListScreen } from "./screens/AssessmentsSchedulesListScreen";
import { SelectEntryTypeScreen } from "./screens/SelectEntryTypeScreen";
import { EditCustomFrequencyScreen } from "./screens/ScheduleScreens/EditCustomFrequencyScreen";
import { Frequency } from "../models/Frequency";
import { SettingsScreen } from "./screens/SettingsScreen";
import { EditHistoryTableSettingsScreen } from "./screens/HistoryTable/EditHistoryTableSettingsScreen";
import { FontAwesomeFreeSolid } from "@react-native-vector-icons/fontawesome-free-solid/static";
import { Entypo } from "@react-native-vector-icons/entypo/static";
import { Octicons } from "@react-native-vector-icons/octicons/static";
import Lucide from "@react-native-vector-icons/lucide/static";
import { GaugesListScreen } from "./screens/GaugesListScreen";
import { EditGaugeScreen } from "./screens/EditGaugeScreen";
import { Metric } from "../models/Gauge";
import { EmptyTreatment, OperationAny } from "../models/Gauge";
import { CustomDrawerContent } from "./CustomDrawerContent";

const TopTab = createMaterialTopTabNavigator();

function SchedulesTabs() {
  return (
    <TopTab.Navigator
      screenOptions={{
        tabBarLabelStyle: {
          fontSize: 16,
        },
      }}
    >
      <TopTab.Screen
        name="SchedulesTabsMedicine"
        component={MedicineSchedulesListScreen}
        options={{
          title: "Medicines",
        }}
      />

      <TopTab.Screen
        name="AssessmentSchedulesTabsMedicine"
        component={AssessmentSchedulesListScreen}
        options={{
          title: "Assessments",
        }}
      />
    </TopTab.Navigator>
  );
}

export interface MedicineParam {
  name: string;
  baseUnit: BaseUnit;
  activeIngredients: ActiveIngredient[];
  dbId?: number;
}

export interface AssessmentParam {
  name: string;
  type: ValueType;
  valueDomain: ValueDomain;
  dbId?: number;
}

export type DrawerTabsParamList = {
  Home: { selectedDate?: string; groupIdFromNotification?: number } | undefined;
  MedicinesList: undefined;
  AssessmentsList: undefined;
  SchedulesList: undefined;
  GroupsList: undefined;
  RecordHistoryScreen: undefined;
  SettingsScreen: undefined;
};

const Drawer = createDrawerNavigator();

function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={CustomDrawerContent}
      screenOptions={({ theme, navigation }) => ({
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.text,

        drawerStyle: {
          backgroundColor: theme.colors.card,
        },

        drawerLabelStyle: {
          fontSize: 16,
        },

        headerStyle: {
          backgroundColor: theme.colors.card,
        },

        headerTintColor: theme.colors.text,

        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            style={{
              marginLeft: 16,
              marginRight: 10,
            }}
          >
            <Ionicons name="menu" size={28} color={theme.colors.text} />
          </TouchableOpacity>
        ),
      })}
    >
      <Drawer.Screen
        name="Home"
        component={HomeSwipeable}
        options={{
          drawerLabel: "Home",
          drawerIcon: ({ color, size }) => (
            <Octicons name="home-fill" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="MedicinesList"
        component={MedicineListScreen}
        options={{
          title: "Medicines",
          drawerIcon: ({ color, size }) => (
            <FontAwesomeFreeSolid name="pills" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="AssessmentsList"
        component={AssessmentListScreen}
        options={{
          title: "Assessments",
          drawerIcon: ({ color, size }) => (
            <Entypo name="ruler" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="SchedulesList"
        component={SchedulesTabs}
        options={{
          title: "Schedules",
          drawerIcon: ({ color, size }) => (
            <Lucide name="calendar-range" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="GroupsList"
        component={GroupListScreen}
        options={{
          title: "Groups and Notifications",
          drawerIcon: ({ color, size }) => (
            <FontAwesomeFreeSolid name="bell" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="RecordHistoryScreen"
        component={HistoryTableScreen}
        options={{
          title: "History Table",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="GaugesList"
        component={GaugesListScreen}
        options={{
          title: "Gauges",
          drawerIcon: ({ color, size }) => (
            <Entypo name="gauge" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="SettingsScreen"
        component={SettingsScreen}
        options={{
          title: "Settings",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-sharp" size={size} color={color} />
          ),
          drawerItemStyle: {
            marginTop: "auto",
          },
        }}
      />
    </Drawer.Navigator>
  );
}

export type RootStackParamList = {
  DrawerTabs: NavigatorScreenParams<DrawerTabsParamList>;
  EditMedicineScreen: {
    mode: "save-and-go-back" | "schedule" | "one-time";
    medicine?: Medicine;
  };
  EditAssessmentScreen: {
    mode: "create-and-go-back" | "update-and-go-back" | "schedule" | "one-time";
    assessment?: Assessment;
  };
  SelectEntryTypeScreen:
    { mode: "schedule" | "one-time"; selectedDate?: string } | undefined;
  SelectMedicineScreen:
    { mode: "schedule" | "one-time"; selectedDate?: string } | undefined;
  SelectAssessmentScreen:
    { mode: "schedule" | "one-time"; selectedDate?: string } | undefined;
  EditMedicineScheduleScreen: {
    medicine: MedicineParam;
    customFrequency?: {
      freq: Frequency;
      offsetsMultiplier: number[] | null;
    };
  };
  EditAssessmentScheduleScreen: {
    assessment: AssessmentParam;
    customFrequency?: {
      freq: Frequency;
      offsetsMultiplier: number[] | null;
    };
  };
  PartiallyEditAnyScheduleScreen: {
    scheduleId: number;
    scheduleType: "assessment" | "medicine";
  };
  EditSingleDosageScreen: {
    medicine: {
      name: string;
      baseUnit: BaseUnit;
      activeIngredients: ActiveIngredient[];
      dbId?: number;
    };
    selectedDate?: string;
  };
  EditSingleMeasurementScreen: {
    assessment: {
      name: string;
      type: ValueType;
      dbId?: number;
    };
    selectedDate?: string;
  };
  EditGroupScreen: {
    group?: {
      name: string;
      color: string;
      isReminderOn: boolean;
      reminderTime: string | null;
      dbId: number;
    };
  };
  EditGaugeScreen: {
    gauge?: {
      dbId: number;
      sourceColumn: Metric;
      operation: OperationAny;
      emptyTreatment: EmptyTreatment;
      lengthInDays: number;
      precision: number;
    };
  };
  EditCustomFrequencyScreen: undefined;
  EditRecordHistoryConfigurationScreen: undefined;
  NotFound: undefined;
};

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
    DrawerTabs: {
      screen: DrawerNavigator,
      options: {
        title: "Home",
        headerShown: false,
      },
    },
    SelectEntryTypeScreen: {
      screen: SelectEntryTypeScreen,
      options: {
        presentation: "modal",
        title: "Select entry type",
      },
    },
    SelectMedicineScreen: {
      screen: SelectMedicineScreen,
      options: {
        presentation: "modal",
        title: "Select medicine",
      },
    },
    SelectAssessmentScreen: {
      screen: SelectAssessmentScreen,
      options: {
        presentation: "modal",
        title: "Select assessment",
      },
    },
    EditMedicineScreen: {
      screen: EditMedicineScreen,
      options: {
        presentation: "modal",
        title: "Edit medicine",
      },
    },
    EditAssessmentScreen: {
      screen: EditAssessmentScreen,
      options: {
        presentation: "modal",
        title: "Edit assessment",
      },
    },
    EditMedicineScheduleScreen: {
      screen: EditMedicineScheduleScreen,
      options: {
        presentation: "modal",
        title: "Edit schedule",
      },
    },
    EditAssessmentScheduleScreen: {
      screen: EditAssessmentScheduleScreen,
      options: {
        presentation: "modal",
        title: "Edit schedule",
      },
    },
    PartiallyEditAnyScheduleScreen: {
      screen: PartiallyEditAnyScheduleScreen,
      options: {
        presentation: "modal",
        title: "Edit schedule dates",
      },
    },
    EditSingleDosageScreen: {
      screen: EditSingleDosageScreen,
      options: {
        presentation: "modal",
        title: "Add single dosage",
      },
    },
    EditSingleMeasurementScreen: {
      screen: EditSingleMeasurementScreen,
      options: {
        presentation: "modal",
        title: "Add single measurement",
      },
    },
    EditGroupScreen: {
      screen: EditGroupScreen,
      options: {
        presentation: "modal",
        title: "Edit group",
      },
    },
    EditGaugeScreen: {
      screen: EditGaugeScreen,
      options: {
        presentation: "modal",
        title: "Edit gauge",
      },
    },
    EditCustomFrequencyScreen: {
      screen: EditCustomFrequencyScreen,
      options: {
        presentation: "modal",
        title: "Create custom frequency",
      },
    },
    EditRecordHistoryConfigurationScreen: {
      screen: EditHistoryTableSettingsScreen,
      options: {
        presentation: "modal",
        title: "History table configuration",
      },
    },
    NotFound: {
      screen: NotFound,
      options: {
        title: "Not Found",
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
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
