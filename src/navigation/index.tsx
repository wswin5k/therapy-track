import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStaticNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity } from "react-native";
import { EditMedicineScreen } from "./screens/EditMedicineScreen";
import { NotFound } from "./screens/NotFound";
import { SchedulesListScreen } from "./screens/SchedulesListScreen";
import type {
  ActiveIngredient,
  BaseUnit,
  Medicine,
} from "../models/MedicineSchedule";
import EditMedicineScheduleScreen from "./screens/ScheduleScreens/EditMedicineScheduleScreen";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { SelectMedicineScreen } from "./screens/SelectMedicineScreen";
import { MedicineListScreen } from "./screens/MedicineListScreen";
import { EditSingleDosageScreen } from "./screens/EditSingleDosageScreen";
import { RecordHistoryScreen } from "./screens/RecordHistoryScreen";
import PartiallyEditMedicineScheduleScreen from "./screens/ScheduleScreens/PartiallyEditMedicineScheduleScreen";
import { EditGroupScreen } from "./screens/EditGroupScreen";
import { GroupListScreen } from "./screens/GroupListScreen";
import {
  Assessment,
  AssessmentType,
  ValueDomain,
} from "../models/AssessmentSchedule";
import { EditAssessmentScreen } from "./screens/EditAssessmentScreen";
import { EditSingleMeasurmentScreen } from "./screens/EditSingleMeasurmentScreen";
import EditAssessmentScheduleScreen from "./screens/ScheduleScreens/EditAssessmentScheduleScreen";
import { HomeSwipeable } from "./screens/HomeSwipeable";
import { SelectAssessmentScreen } from "./screens/SelectAssessmentScreen";
import { AssessmentListScreen } from "./screens/AssessmentListScreen";

export interface MedicineParam {
  name: string;
  baseUnit: BaseUnit;
  activeIngredients: ActiveIngredient[];
  dbId?: number;
}

export interface AssessmentParam {
  name: string;
  type: AssessmentType;
  valueDomain: ValueDomain;
  dbId?: number;
}

export type RootStackParamList = {
  HomeTabs: undefined;
  EditMedicineScreen: {
    mode: "save-and-go-back" | "schedule" | "one-time";
    medicine?: Medicine;
  };
  EditAssessmentScreen: {
    mode: "save-and-go-back" | "schedule" | "one-time";
    assessment?: Assessment;
  };
  SelectMedicineScreen:
    | { mode: "schedule" | "one-time"; selectedDate?: string }
    | undefined;
  SelectAssessmentScreen:
    | { mode: "schedule" | "one-time"; selectedDate?: string }
    | undefined;
  EditMedicineScheduleScreen: {
    medicine: MedicineParam;
  };
  EditAssessmentScheduleScreen: {
    assessment: AssessmentParam;
  };
  PartiallyEditMedicineScheduleScreen: {
    scheduleId: number;
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
  EditSingleMeasurmentScreen: {
    assessment: {
      name: string;
      type: AssessmentType;
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
  NotFound: undefined;
};

const HomeTabs = createDrawerNavigator({
  screenOptions: ({ theme, navigation }) => ({
    drawerActiveTintColor: theme.colors.primary,
    drawerInactiveTintColor: theme.colors.text,
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
      screen: HomeSwipeable,
      options: {
        drawerLabel: "Home",
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
    AssessmentsList: {
      screen: AssessmentListScreen,
      options: {
        title: "Assessments",
        drawerIcon: ({ color, size }: { color: string; size: number }) => (
          <Ionicons name="podium" size={size} color={color} />
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
    GroupsList: {
      screen: GroupListScreen,
      options: {
        title: "Groups and Notifications",
        drawerIcon: ({ color, size }: { color: string; size: number }) => (
          <Ionicons name="folder" size={size} color={color} />
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
        title: "Home",
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
    PartiallyEditMedicineScheduleScreen: {
      screen: PartiallyEditMedicineScheduleScreen,
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
    EditSingleMeasurmentScreen: {
      screen: EditSingleMeasurmentScreen,
      options: {
        presentation: "modal",
        title: "Add single measurment",
      },
    },
    EditGroupScreen: {
      screen: EditGroupScreen,
      options: {
        presentation: "modal",
        title: "Edit group",
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
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
